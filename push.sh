#!/bin/bash

git add .
git commit -m "Update"
#
git checkout --orphan latest_branch
git add -A
git commit -am "Update"
git branch -D main
git branch -m main
git push -f origin main

# git push --set-upstream origin main
