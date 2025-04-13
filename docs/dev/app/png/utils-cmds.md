# change png opacity with command line
```sh
convert hand-yellow-64.png -alpha set -background none -channel A -evaluate multiply 0.85 +channel hand-yellow-64.png
```