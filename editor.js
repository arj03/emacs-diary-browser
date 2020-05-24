import { moveFile, writeFile, deleteFile } from './files.js'
import { commit, remove as gitremove, push, pull, getCommits } from './git.js'
import { activeCompleter, setActiveCompleter, diaryCompleter, categoryCompleter, fileCompleter, setupCompleteHelper } from './complete.js'
import { allCategories, allFileIndex, fileIndex, indexFiles, toggleCategory } from './indexer.js'

function autocomplete(cm) {
  CodeMirror.commands.autocomplete(cm, null, {
    completeSingle: false,
    extraKeys: {
      "Ctrl-G": function(cm, menu) {
        menu.close()
      }
    }
  })
}

function formatDate(d) {
  return d.getFullYear() + "-" + ("0"+(d.getMonth()+1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2) + " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2) + ":00"
}

function getDate() {
  return formatDate(new Date())
}

function insertEmptyDocument() {
  cm.setValue("# " + "\ncreated: " + getDate() + ", modified: " + getDate() + "\ncategories:" + "\nbacklinks:"+ "\n".repeat(2))
  cm.setCursor(0, 2)
}

function findLink(cm, startChar, endChar) {
  const pos = cm.getCursor()
  const line = cm.getLine(pos.line)

  let start = pos.ch
  for (; start >= 0; --start)
  {
    if (line[start] == startChar)
      break;
  }
  if (line[start] != startChar)
    return ""

  let end = pos.ch
  for (; end < line.length; ++end)
  {
    if (line[end] == endChar)
      break;
  }

  if (line[end] != endChar)
    return ""
  else
    return line.substring(start+1, end)
}

function findExternalLink(cm, name) {
  var lines = cm.getValue().split("\n")
  for (var i = lines.length - 1; i >= 0; --i) {
    if (lines[i].startsWith(name + ": ")) {
      return lines[i].substr(name.length + 2)
    }
  }
}

async function removeCurrentFile() {
  await gitremove(currentFilename, "delete")
  await push()
  await deleteFile(currentFilename)
}

function updatePrevious(sorted, i) {
  if (i > 0)
    document.getElementById("previousDiary").innerHTML = " &#8693; " + sorted[i - 1].title + " (" + formatDate(sorted[i - 1].modified) + ")"
  else
    document.getElementById("previousDiary").innerHTML = " &#8693; "
}

function nextDiary(cm) {
  const sorted = Object.values(fileIndex).sort(x => x.created)
  if (sorted.length == 0) return
  let i = sorted.findIndex(x => x.filename == currentFilename) // FIXME: handle new file
  if (++i == sorted.length) i = 0
  const prevFile = sorted[i]
  currentFilename = prevFile.filename
  cm.setValue(prevFile.content)

  updatePrevious(sorted, i)
}

function previousDiary(cm) {
  const sorted = Object.values(fileIndex).sort(x => x.created)
  if (sorted.length == 0) return
  let i = sorted.findIndex(x => x.filename == currentFilename) // FIXME: handle new file
  if (--i < 0) i = sorted.length -1
  const prevFile = sorted[i]
  currentFilename = prevFile.filename
  cm.setValue(prevFile.content)

  updatePrevious(sorted, i)
}

var cm = CodeMirror.fromTextArea(document.getElementById("input"), {
  lineNumbers: true,
  mode: "markdown",
  keyMap: "emacs",
  theme: "blackboard",
  matchBrackets: true,
  autofocus: true,
  extraKeys: {
    "Ctrl-X Ctrl-R": function(cm) {
      cm.openDialog("Types 'yes' to remove diary: <input value=\"\">", (answer) => {
        if (answer == "yes") {
          removeCurrentFile().then(indexFiles).then(() => {
            updateHeader()
            nextDiary(cm)
          })
        }
      })
    },
    "Ctrl-X Ctrl-D": function(cm) {
      setActiveCompleter(diaryCompleter)
      autocomplete(cm)
      showMessage("add link to diary")
    },
    "Ctrl-X Ctrl-C": function(cm) {
      setActiveCompleter(categoryCompleter)
      autocomplete(cm)
      showMessage("toggle category")
    },
    "Ctrl-X Ctrl-F": function(cm) {
      setActiveCompleter(fileCompleter)
      autocomplete(cm)
      showMessage("open file")
    },
    "Ctrl-X Ctrl-L": function(cm) {
      const currentLinkName = findLink(cm, "<", ">")
      let currentLink = ""

      if (currentLinkName != "")
        currentLink = findExternalLink(cm, currentLinkName)

      const closeHandler = {
        onKeyDown: function(ev, value, close) {
          if (ev.code == "KeyG" && ev.ctrlKey) {
            ev.preventDefault()
            close()
          }
          if (ev.code == "KeyY" && ev.ctrlKey) {
            ev.preventDefault()
            navigator.clipboard.readText().then(text => {
              ev.target.value = text
            })
          }
        }
      }

      cm.openDialog(currentLinkName != "" ? "Replace link: <input value=\"" + currentLink + "\">" : "Add link: <input>", (link) => {
        if (link) {
          cm.openDialog("Name: <input value=\"" + currentLinkName + "\">", (name) => {
            if (name) {
              if (currentLinkName) {
                const pos = cm.getCursor()
                cm.setValue(cm.getValue().replace("<" + currentLinkName + ">", "<" + name + ">").replace(currentLinkName + ": " + currentLink, name + ": " + link))
                cm.setCursor(pos)
              }
              else
              {
                const doc = cm.getDoc()
                const cursor = doc.getCursor()
                doc.replaceRange("<" + name + ">", cursor)
                doc.replaceRange("\n" + name + ": " + link, { pos: 0, line: doc.lastLine() })
              }
            }
          }, closeHandler)
        }
      }, closeHandler)
    },
    "Alt-Q": function(cm) {
      cm.wrapParagraph(cm.getCursor(), { column: 70 })
    },
    "Alt-W": function(cm) {
      navigator.clipboard.writeText(cm.getSelection())
    },
    "Ctrl-Y": function(cm) {
      navigator.clipboard.readText().then(text => {
        var doc = cm.getDoc()
        var cursor = doc.getCursor()
        doc.replaceRange(text, cursor)
      })
    },
    "Ctrl-Alt-Up": function(cm) {
      nextDiary(cm)
    },
    "Ctrl-Alt-Down": function(cm) {
      previousDiary(cm)
    },
    "Ctrl-Enter": function(cm) {
      save(cm, (saved) => {
        if (saved || window.confirm("Insert empty document anyway?")) {
          insertEmptyDocument()
          currentFilename = ""
        }
      })
    },
    "Enter": function(cm) {
      const selectedInternalLink = findLink(cm, "[", "]")
      const selectedExternalLink = findLink(cm, "<", ">")

      if (selectedInternalLink != "")
      {
        save(cm, (saved) => {
          const selectedFile = allFileIndex[selectedInternalLink]
          if (selectedFile) { // link might have been deleted
            currentFilename = selectedFile.filename
            cm.setValue(selectedFile.content)
          }
        })
      } else if (selectedExternalLink != "") {
        const currentLink = findExternalLink(cm, selectedExternalLink)
        window.open(currentLink, '_blank')
      } else
        return CodeMirror.Pass
    }
  },
  hintOptions: {
    hint: function(cm, option) {
      const cur = cm.getCursor()
      const start = cur.ch
      return {
        list: activeCompleter.options,
        from: CodeMirror.Pos(cur.line, start),
        to: CodeMirror.Pos(cur.line, start)
      }
    }
  }
})

const messagesDOM = document.getElementById("messages")

function showMessage(text) {
  messagesDOM.innerHTML = text

  setTimeout(() => {
    messagesDOM.innerHTML = ""
  }, 500)
}

let currentFilename = ""

export function setFilename(filename) {
  currentFilename = filename
}

export async function save(cm, cb) {
  const filename = cm.getLine(0).substring(1).trim().replace(" ", "_") + ".md"

  if (filename == ".md") {
    showMessage("File has no name!")
    if (cb) cb(false)
    return
  }

  const i = Object.values(fileIndex).find(x => x.filename == currentFilename)
  if (i && i.content == cm.getValue()) {
    if (cb) cb(true)
    return // no changes
  }

  var pos = cm.getCursor()

  var text = cm.getValue()
  var modified = cm.getLine(1).split(",")[1].substring(11)
  text = text.replace('modified: ' + modified, 'modified: ' + getDate())
  cm.setValue(text)

  cm.setCursor(pos)

  if (currentFilename != "" && filename != currentFilename) { // name change
    await moveFile(currentFilename, filename)
    await gitremove(currentFilename)
  }

  currentFilename = filename

  await writeFile(text, filename)
  await indexFiles()
  updateHeader()
  showMessage("file saved")
  await commit(filename, "sync")
  await push()

  if (cb) cb(true)
}

setupCompleteHelper(cm)

CodeMirror.commands.save = save

pull().then(() => {
  getCommits(1).then(commits => {
    const commit = commits[0].commit
    console.log(`last commit ${new Date(commit.author.timestamp * 1000)}, message: ${commit.message}`)
  })
})

function h(tag, attrs, children) {
  var el = document.createElement(tag)

  for (let k in attrs) {
    if (typeof attrs[k] === 'function')
      el.addEventListener(k, attrs[k])
    else
      el.setAttribute(k, attrs[k])
  }

  for (let child of children)
    el.append(child)

  return el
}

const statusDOM = document.getElementById("status")
statusDOM.append(h('span', { id: 'categories'}, ''))
statusDOM.append(h('span', { id: 'filestatus'}, ''))

function updateHeader() {
  updateCategoriesFilter()
  setFilesHeader()
}

function overwriteHTML(id, newContent) {
  const el = document.getElementById(id)
  el.innerHTML = ''
  el.append(newContent)
}

function updateCategoriesFilter()
{
  const cats = allCategories.map(x => h('span', {
    class: 'categoryFilter',
    click: function() { categoryClick(x) }
  }, "[" + x + "]"))
  overwriteHTML("categories", h('span', { class: 'categories' }, ["Categories: ", ...cats]))
}

function setFilesHeader() {
  const files = Object.keys(fileIndex).length
  overwriteHTML("filestatus", files + (files == 1 ? " file" : " files"))
}

function openLatestFile() {
  const sorted = Object.values(fileIndex).sort(x => -x.created)
  if (sorted.length > 0) {
    const file = sorted[0]
    currentFilename = file.filename
    cm.setValue(file.content)

    updatePrevious(sorted, sorted.length - 1)
  }
}

function categoryClick(category) {
  const toggled = toggleCategory(category)

  if (currentFilename != "" && !Object.values(fileIndex).find(x => x.filename == currentFilename))
    openLatestFile()

  const categories = document.getElementsByClassName('categoryFilter')
  for (var i = 0; i < categories.length; ++i)
  {
    if (categories[i].innerHTML == "[" + category + "]")
    {
      if (toggled)
        categories[i].classList.add("active")
      else
        categories[i].classList.remove("active")
    }
  }

  setFilesHeader()
}

indexFiles().then(() => {
  if (Object.values(fileIndex).length > 0)
    openLatestFile()
  else
    insertEmptyDocument()

  updateHeader()
})


/*
document.onkeydown = function(e) {
  if (e.ctrlKey && e.key === 'y') {
    e.preventDefault()

    var start = editor.getCursor();
    navigator.clipboard.readText().then(text => {
      editor.replaceRange(text, start, start, "paste")
    })
  }
}
*/

/*
var converter = new showdown.Converter()

var preview = document.getElementById("preview")

editor.on('change', function() {
  preview.innerHTML = converter.makeHtml(editor.getValue())
})
*/


