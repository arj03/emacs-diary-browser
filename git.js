import { fs, dir } from './files.js'

function authData() {
  return {
    username: localStorage['gitUsername'],
    password: localStorage['gitPassword']
  }
}

function authorData() {
  return {
    name: localStorage['gitName'],
    email: localStorage['gitEmail']
  }
}

function url() {
  return localStorage['gitURL']
}

function setUI(id) {
  document.getElementById(id).value = localStorage[id] || ''
}

setUI('gitUsername')
setUI('gitPassword')
setUI('gitName')
setUI('gitEmail')
setUI('gitURL')

function saveUI(id) {
  localStorage[id] = document.getElementById(id).value
}

document.getElementById('gitSave').onclick = function(ev) {
  ev.preventDefault()

  saveUI('gitUsername')
  saveUI('gitPassword')
  saveUI('gitName')
  saveUI('gitEmail')
  saveUI('gitURL')
}

function hideGitConfig() {
  const form = document.getElementById('gitForm')
  const header = document.getElementById('gitHeader')

  header.style.transform = 'translateX(40%) rotate(-90.0deg)'
  form.style.visibility = 'hidden'
}

if (localStorage['gitHeader'] == 'hidden') {
  hideGitConfig()
}

document.getElementById('gitHeader').onclick = function(ev) {
  const form = document.getElementById('gitForm')

  if (form.style.visibility == '') {
    hideGitConfig()
    localStorage['gitHeader'] = 'hidden'
  }
  else {
    const header = document.getElementById('gitHeader')
    header.style.transform = ''
    form.style.visibility = ''
    localStorage['gitHeader'] = 'visible'
  }
}

export async function getCommits(depth) {
  let commits = await git.log({fs, depth, dir})
  return commits
}

export async function cloneRepo() {
  return await git.clone({
    fs,
    http: GitHttp,
    dir,
    url: url(),
    onAuth: authData
  })
}

export async function remove(file, msg) {
  console.log("removing", file)
  await git.remove({fs, dir, filepath: file})

  let sha = await git.commit({
    fs,
    dir,
    message: msg,
    author: authorData()
  })

  console.log(sha)
}

export async function commit(file, msg) {
  await git.add({fs, dir, filepath: file})

  let sha = await git.commit({
    fs,
    dir,
    message: msg,
    author: authorData()
  })

  console.log(sha)
}

export async function push() {
  await git.push({
    fs,
    http: GitHttp,
    dir,
    onAuth: authData
  })
}

export async function pull() {
  await git.pull({
    fs,
    http: GitHttp,
    dir,
    onAuth: authData,
    author: authorData()
  })
}
