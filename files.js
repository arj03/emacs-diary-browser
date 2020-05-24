export const fs = new LightningFS('fs') /* , { wipe: true } */
window.pfs = fs.promises

export const dir = '/repo'

export async function listFiles() {
  try {
    return await window.pfs.readdir(dir)
  } catch (e) {
    await window.pfs.mkdir(dir)
    return await window.pfs.readdir(dir)
  }
}

export async function moveFile(oldfile, newfile) {
  return await window.pfs.rename(`${dir}/${oldfile}`, `${dir}/${newfile}`)
}

export async function deleteFile(file) {
  return await window.pfs.unlink(`${dir}/${file}`)
}

export async function writeFile(content, file) {
  return await window.pfs.writeFile(`${dir}/${file}`, content, 'utf8')
}

export async function readFile(file) {
  return await window.pfs.readFile(`${dir}/${file}`, "utf8")
}
