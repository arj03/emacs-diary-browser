import { allTitles, allCategories, allFileIndex, titles } from './indexer.js'
import { save, setFilename } from './editor.js'

function completer(allOptions, modifySelectResult) {
  return {
    options: allOptions,
    allOptions,
    modifySelectResult
  }
}

export function setupCompleteHelper(editor) {
  var matching = ""

  const excludedKeys = {
    "8": "backspace",
    "9": "tab",
    "13": "enter",
    "16": "shift",
    "17": "ctrl",
    "18": "alt",
    "19": "pause",
    "20": "capslock",
    "27": "escape",
    "33": "pageup",
    "34": "pagedown",
    "35": "end",
    "36": "home",
    "37": "left",
    "38": "up",
    "39": "right",
    "40": "down",
    "45": "insert",
    "46": "delete",
    "91": "left window key",
    "92": "right window key",
    "93": "select",
    "107": "add",
    "109": "subtract",
    "110": "decimal point",
    "111": "divide",
    "112": "f1",
    "113": "f2",
    "114": "f3",
    "115": "f4",
    "116": "f5",
    "117": "f6",
    "118": "f7",
    "119": "f8",
    "120": "f9",
    "121": "f10",
    "122": "f11",
    "123": "f12",
    "144": "numlock",
    "145": "scrolllock",
    "186": "semicolon",
    "187": "equalsign",
    "188": "comma",
    "189": "dash",
    "190": "period",
    "191": "slash",
    "192": "graveaccent",
    "220": "backslash",
    "222": "quote"
  }

  function functionName(fun) {
    let ret = fun.toString()
    ret = ret.substr('function '.length)
    ret = ret.substr(0, ret.indexOf('('))
    return ret
  }

  editor.on("keydown", function (cm, event) {
    let ac = activeCompleter

    if (cm.state.completionActive) {
      if (functionName(cm.state.completionActive.pick) == 'selectHandler') return

      const pick = cm.state.completionActive.pick
      function selectHandler(data, i) {
        var useResult = ac.modifySelectResult(data, i, cm)
        if (useResult)
          pick.apply(this, arguments)
        else
          cm.state.completionActive.close()
      }
      cm.state.completionActive.pick = selectHandler
    }

    if (cm.state.completionActive && !excludedKeys[(event.keyCode || event.which).toString()]) {
      matching += event.key
      ac.options = ac.allOptions.filter(x => x.indexOf(matching) != -1)
      CodeMirror.commands.autocomplete(cm, null, { completeSingle: false })

      if (ac.options.length > 0)
        event.preventDefault()

    } else if (event.keyCode == 8 && matching.length > 0) { // backspace
      matching = matching.substring(0, matching.length-1)
      ac.options = ac.allOptions.filter(x => x.indexOf(matching) != -1)
      CodeMirror.commands.autocomplete(cm, null, { completeSingle: false })
    } else {
      matching = ""
      ac.options = ac.allOptions
    }
  })
}

export let diaryCompleter = completer(
  allTitles,
  function(data, i) {
    data.list = data.list.slice()
    const completion = data.list[i]
    data.list[i] = '[' + completion + ']'
    return true
  }
)

export let categoryCompleter = completer(
  allCategories,
  function(data, i, cm) {
    let selected = data.list[i]
    let categoryLine = cm.getLine(2)
    let categories = categoryLine.substring("categories: ".length).split(",").filter(x => x != "").map(x => x.trim())
    if (categories.includes(selected))
    {
      let newCategories = "categories: " + categories.filter(x => x != selected).join(",") + "\n"
      cm.replaceRange(newCategories, {line: 2, ch: 0}, {line: 3, ch: 0})
    }
    else
    {
      categories.push(selected)
      let newCategories = "categories: " + categories.join(",") + "\n"
      cm.replaceRange(newCategories, {line: 2, ch: 0}, {line: 3, ch: 0})
    }

    return false
  }
)

export let fileCompleter = completer(
  titles,
  function(data, i, cm) {
    let selected = data.list[i]

    save(cm, (saved) => {
      if (saved || window.confirm("Unable to save, change diary anyway?")) {
        const selectedFile = allFileIndex[selected]
        setFilename(selectedFile.filename)
        cm.setValue(selectedFile.content)
      }
    })

    return false
  }
)

export function setActiveCompleter(completer) {
  activeCompleter = completer
}

export let activeCompleter = diaryCompleter
