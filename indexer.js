import { listFiles, readFile } from './files.js'

export let allFileIndex = {}
export let allCategories = []
export let allTitles = []

export let titles = []
export let fileIndex = {}
let selectedCategories = []

function setArray(arr, newArr) {
  arr.splice(0, arr.length)
  newArr.forEach(function(v) { arr.push(v) })
}

function parseContent(content, filename) {
  const lines = content.split("\n")

  let links = []

  const title = lines[0].substring(1).trim()
  for (var i = 4; i < lines.length; ++i)
  {
    const matches = lines[i].match(/\[(.*?)\]/g)
    if (matches)
      matches.forEach(function(v) { links.push(v.substring(1, v.length-1)) })
  }

  return {
    title,
    filename,
    content,
    created: new Date(lines[1].split(",")[0].substring(9)),
    modified: new Date(lines[1].split(",")[1].substring(9)),
    categories: lines[2].substring("categories: ".length).split(",").filter(x => x != ""),
    backlinks: [],
    links
  }
}

function updateAll() {
  let fileObjects = Object.values(fileIndex)
  setArray(allCategories, [...new Set(fileObjects.map(x => x.categories).flat().map(x => x.trim()))])
  const fileTitles = fileObjects.map(x => x.title)
  setArray(allTitles, fileTitles)
  setArray(titles, fileTitles)
}

function filterOnCategories() {
  for (const k in fileIndex) delete fileIndex[k]
  for (const index in allFileIndex) {
    const file = allFileIndex[index]
    const unionCategories = file.categories.filter(t => selectedCategories.includes(t))
    if (unionCategories.length == selectedCategories.length)
      fileIndex[index] = file
  }

  setArray(titles, Object.values(fileIndex).map(x => x.title))
}

export async function indexFiles() {
  for (const k in fileIndex) delete fileIndex[k]
  for (const k in allFileIndex) delete fileIndex[k]

  let files = await listFiles()
  for (const file of files) {
    if (!file.endsWith(".md")) continue

    const parsed = parseContent(await readFile(file), file)
    fileIndex[parsed.title] = parsed
  }

  for (const index in fileIndex) {
    for (var i = 0; i < fileIndex[index].links.length; ++i) {
      const link = fileIndex[index].links[i]
      if (link != index && fileIndex[link])
        fileIndex[link].backlinks.push(index)
    }
  }

  for (const index in fileIndex) {
    const file = fileIndex[index]
    const lines = file.content.split("\n")
    if (!lines[3].startsWith("backlinks:"))
      lines.splice(3, 0, "backlinks: " + file.backlinks.map(x => "[" + x + "]").join(","))
    else
      lines[3] = "backlinks: " + file.backlinks.map(x => "[" + x + "]").join(",")
    file.content = lines.join("\n")
  }

  for (const k in fileIndex) allFileIndex[k] = fileIndex[k]

  updateAll()

  setArray(selectedCategories, selectedCategories.filter(x => allCategories.indexOf(x) != -1))

  if (selectedCategories.length > 0)
    filterOnCategories()
}

export function toggleCategory(category) {
  const i = selectedCategories.indexOf(category)
  if (i == -1)
    selectedCategories.push(category)
  else
    selectedCategories.splice(i, 1)

  if (selectedCategories.length == 0) {
    for (const k in fileIndex) delete fileIndex[k]
    for (const k in allFileIndex) fileIndex[k] = allFileIndex[k]

    setArray(titles, Object.values(fileIndex).map(x => x.title))

    return false
  }
  else
  {
    filterOnCategories()

    return true
  }
}
