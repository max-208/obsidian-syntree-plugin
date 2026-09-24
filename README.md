# Syntax tree generator

this project is a port of [syntree](https://github.com/mshang/syntree) (also known as [https://mshang.ca/syntree/](https://mshang.ca/syntree/)) to an obsidian plugin.


## how to use

Simply write your syntax tree in labelled bracket notation, and sourround it by three ticks (`) above and below, alongside the "syntree" indicator, like in the following example :

![example text](./images/example_text.png)
![example diagram](./images/example_diagram.png)

## features

add a node : `[parent child]`
![line](./images/line.png)

use nesting : `[parent [parent child]]`
![nesting](./images/nesting.png)

add multiple child nodes : `[root [parent child] [parent child]]`
![multiple child nodes](./images/multiple_child.png)

add a triangle : `[parent^ child]`
![triangle](./images/triangle.png)

add a triangle : `[parent^ child]`
![triangle](./images/triangle.png)

add a silent head : `[root \0]`
![silent head](./images/silent_head.png)

use brackets in node names : `[root {child}]`
![brackets in node](./images/brackets.png)