# Emacs diary browser

Emacs diary browser is a offline first note taking tool running in the
browser. It is inspired by Emacs and org-mode but uses a custom plain
text format. Notes can be synced to a remote [git
reposity](https://people.iola.dk/arj/2020/04/28/gitea-and-cors/). It
is intended as a personal tool, if you find it useful as well you are
free to use and improve it.

To run from your local machine you need to run it from a http-server
like https://www.npmjs.com/search?q=http-server

Keys:
 ! alt-q:          auto indent
 ! alt-w:          copy (must run from http://, not file://)
 ! Ctrl-y:         paste (must run from http://, not file://)
 ! Ctrl-enter:     new file
 ! Ctrl-x Ctrl-f:  open file
 ! Ctrl-x Ctrl-s:  save file
 ! Ctrl-x Ctrl-l:  insert external link
 ! Ctrl-x Ctrl-c:  toggle category
 ! Ctrl-x Ctrl-d:  insert link to another diary
 ! Ctrl-x Ctrl-r:  remove diary
 - Ctrl-s:         search
 ! Enter on link:  open link
 ! Ctrl-alt-up:    prev file
 ! Ctrl-alt-down:  next file

Known problems:
 - Search (number of results, inline in file)
 - check if filename has already been taken on save

## File format:

The filename is the header of the file with space replaced with underscore.

```
# Header
created: 2020-04-29 11:40:00, modified: 2020-04-29 11:40:00
categories cat1,cat2
backlinks: [Another header]

Actual content <link> to another doc [Header]

link: https://test.dk
```
