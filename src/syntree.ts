// Typescript re-write of 
// https://github.com/mshang/syntree
// some aspects of the code have been slightly modified to accomodate changes in design and function
/**
Copyright (C) 2011 by mshang

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

const margin = 15; // Number of pixels from tree to edge on each side.
const padding_above_text = 6; // Lines will end this many pixels above text.
const padding_below_text = 6;

class Node {
	value: string | null = null;
	step: number | null = null;
	draw_triangle = false;
	label: string | null = null;
	tail: string | null = null;
	max_y = 0;
	children: Node[] = [];
	has_children = false;
	first: Node | null = null;
	last: Node | null = null;
	parent: Node | null = null;
	next: Node | null = null;
	previous: Node | null = null;
	x = 0;
	y = 0;
	head_chain = false;
	tail_chain = false;
	starred = false;
	left_width = 0;
	right_width = 0;

	set_siblings(parent: Node | null): void {
		for (const child of this.children) child.set_siblings(this);
		this.has_children = this.children.length > 0;
		this.parent = parent;
		if (this.has_children) {
			this.first = this.children[0] ?? null;
			this.last = this.children[this.children.length - 1] ?? null;
		}
		for (let i = 0; i < this.children.length - 1; i++) {
			const child = this.children[i];
			const next = this.children[i + 1];
			if (child && next) child.next = next;
		}
		for (let i = 1; i < this.children.length; i++) {
			const child = this.children[i];
			const previous = this.children[i - 1];
			if (child && previous) child.previous = previous;
		}
	}

	check_triangle(): void {
		this.draw_triangle = !this.has_children && (this.parent?.starred ?? false);
		for (let child = this.first; child != null; child = child.next) child.check_triangle();
	}

	set_width(ctx: CanvasRenderingContext2D, _vert_space: number, hor_space: number, font: string): void {
		ctx.font = font;
		const val_width = ctx.measureText(this.value ?? '').width;
		for (let child = this.first; child != null; child = child.next) child.set_width(ctx, _vert_space, hor_space, font);
		if (!this.has_children) {
			this.left_width = val_width / 2;
			this.right_width = val_width / 2;
			return;
		}
		this.step = 0;
		for (let child = this.first; child?.next != null; child = child.next) {
			this.step = Math.max(this.step, child.right_width + hor_space + child.next.left_width);
		}
		const step = this.step;
		const first = this.first;
		const last = this.last;
		if (first == null || last == null) return;
		const sub = ((this.children.length - 1) / 2) * step;
		this.left_width = Math.max(sub + first.left_width, val_width / 2);
		this.right_width = Math.max(sub + last.right_width, val_width / 2);
	}

	find_height(): number {
		this.max_y = this.y;
		for (let child = this.first; child != null; child = child.next) this.max_y = Math.max(this.max_y, child.find_height());
		return this.max_y;
	}

	assign_location(x: number, y: number, font_size: number, term_lines: boolean, vert_space: number): void {
		this.x = Math.floor(x) + 0.5;
		this.y = Math.floor(y) + 0.5;
		if (this.has_children) {
			const step = this.step ?? 0;
			const left_start = x - step * ((this.children.length - 1) / 2);
			for (const [index, child] of this.children.entries()) child.assign_location(left_start + index * step, y + vert_space, font_size, term_lines, vert_space);
		} else if (this.parent && !term_lines && this.parent.children.length === 1 && !this.draw_triangle) {
			this.y = this.parent.y + padding_above_text + padding_below_text + font_size;
		}
	}

	draw(ctx: CanvasRenderingContext2D, font_size: number, font: string, term_lines: boolean, node_color: string, node_terminal_color: string): void {
		ctx.font = font;
		ctx.fillStyle = this.has_children ? node_color : node_terminal_color;
		ctx.fillText(this.value ?? '', this.x, this.y);
		for (let child = this.first; child != null; child = child.next) child.draw(ctx, font_size, font, term_lines, node_color, node_terminal_color);
		if (!this.parent) return;
		if (this.draw_triangle) {
			ctx.moveTo(this.parent.x, this.parent.y + padding_below_text);
			ctx.lineTo(this.x - this.left_width, this.y - font_size - padding_above_text);
			ctx.lineTo(this.x + this.right_width, this.y - font_size - padding_above_text);
			ctx.lineTo(this.parent.x, this.parent.y + padding_below_text);
			ctx.stroke();
			return;
		}
		if (!this.has_children && !term_lines && this.parent.children.length === 1) return;
		ctx.moveTo(this.parent.x, this.parent.y + padding_below_text);
		ctx.lineTo(this.x, this.y - font_size - padding_above_text);
		ctx.stroke();
	}

	find_head(label: string): Node | null {
		for (let child = this.first; child != null; child = child.next) {
			const result = child.find_head(label);
			if (result != null) return result;
		}
		return this.label === label ? this : null;
	}

	find_movement(movement_lines: MovementLine[], root: Node): void {
		for (let child = this.first; child != null; child = child.next) child.find_movement(movement_lines, root);
		if (this.tail != null) {
			const movement = new MovementLine();
			movement.tail = this;
			movement.head = root.find_head(this.tail);
			movement_lines.push(movement);
		}
	}

	reset_chains(): void {
		this.head_chain = false;
		this.tail_chain = false;
		for (let child = this.first; child != null; child = child.next) child.reset_chains();
	}

	find_intervening_height(leftwards: boolean): number {
		let max_y = this.y;
		let node = leftwards ? this.previous : this.next;
		while (node != null) {
			if (!node) break;
			if (node.head_chain || node.tail_chain) return max_y;
			max_y = Math.max(max_y, node.max_y);
			node = leftwards ? node.previous : node.next;
		}
		return this.parent ? Math.max(max_y, this.parent.find_intervening_height(leftwards)) : max_y;
	}
}

class MovementLine {
	head: Node | null = null;
	tail: Node | null = null;
	lca: Node | null = null;
	dest_x = 0;
	dest_y = 0;
	bottom_y = 0;
	max_y = 0;
	should_draw = false;
	leftwards = false;

	set_up(vert_space: number): void {
		this.should_draw = false;
		if (this.tail == null || this.head == null || !this.check_head()) return;
		this.find_lca();
		if (this.lca == null) return;
		this.find_intervening_height();
		this.dest_x = this.head.x;
		this.dest_y = this.head.max_y;
		this.bottom_y = this.max_y + vert_space;
		this.should_draw = true;
	}

	check_head(): boolean {
		if (this.tail == null || this.head == null) return false;
		let node = this.tail;
		node.tail_chain = true;
		while (node.parent != null) {
			node = node.parent;
			if (node === this.head) return false;
			node.tail_chain = true;
		}
		return true;
	}

	find_lca(): void {
		if (this.head == null) return;
		let node = this.head;
		node.head_chain = true;
		this.lca = null;
		while (node.parent != null) {
			node = node.parent;
			node.head_chain = true;
			if (node.tail_chain) {
				this.lca = node;
				break;
			}
		}
	}

	find_intervening_height(): void {
		if (this.lca == null || this.tail == null || this.head == null) return;
		for (let child = this.lca.first; child != null; child = child.next) {
			if (child.head_chain || child.tail_chain) {
				this.leftwards = child.head_chain;
				break;
			}
		}
		this.max_y = Math.max(
			this.tail.find_intervening_height(this.leftwards),
			this.head.find_intervening_height(!this.leftwards),
			this.head.max_y,
		);
	}

	draw(ctx: CanvasRenderingContext2D, line_color: string): void {
		if (this.tail == null) return;
		let tail_x = this.tail.x + 3;
		this.dest_x -= 3;
		if (this.leftwards) {
			tail_x -= 6;
			this.dest_x += 6;
		}
		ctx.moveTo(tail_x, this.tail.y + padding_below_text);
		ctx.quadraticCurveTo(tail_x, this.bottom_y, (tail_x + this.dest_x) / 2, this.bottom_y);
		ctx.quadraticCurveTo(this.dest_x, this.bottom_y, this.dest_x, this.dest_y + padding_below_text);
		ctx.stroke();
		ctx.beginPath();
		ctx.lineTo(this.dest_x + 3, this.dest_y + padding_below_text + 10);
		ctx.lineTo(this.dest_x - 3, this.dest_y + padding_below_text + 10);
		ctx.lineTo(this.dest_x, this.dest_y + padding_below_text);
		ctx.closePath();
		ctx.fillStyle = line_color;
		ctx.fill();
	}
}

export default function go(
	canvas: HTMLCanvasElement,
	str: string,
	font_size: number,
	font: string,
	term_lines: boolean,
	node_color: string,
	node_terminal_color: string,
	line_color: string,
	background_color: string,
): HTMLCanvasElement {
	
	const full_font = font_size + "pt " + font;
	const vert_space = font_size * 3;
	const hor_space = font_size * 1.5;


	// Clean up the string
	str = str.replace(/^\s+/, "");
	let open = 0;
	for (let i = 0; i < str.length; i++) {
		if (str[i] == "[") open++;
		if (str[i] == "]") open--;
	}
	while (open < 0) {
		str = "[" + str;
		open++;
	}
	while (open > 0) {
		str = str + "]";
		open--;
	}
	
	const root = parse(str);
	root.set_siblings(null);
	root.check_triangle();
	
	let ctx: CanvasRenderingContext2D | null;
	
	try {
		ctx = canvas.getContext('2d');
	} catch {
		throw new Error('canvas');
	}
	
	if (ctx == null) throw new Error('canvas');
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	

	// Find out dimensions of the tree.
	root.set_width(ctx, vert_space, hor_space, full_font);
	root.assign_location(0, 0, font_size, term_lines, vert_space);
	root.find_height();
	
	const movement_lines: MovementLine[] = [];
	root.find_movement(movement_lines, root);
	for (let i = 0; i < movement_lines.length; i++) {
		root.reset_chains();
		movement_lines[i]?.set_up(vert_space);
	}
	
	// Set up the canvas.
	const width = root.left_width + root.right_width + 2 * margin;
	let height = root.max_y + font_size + 2 * margin;
	// Problem: movement lines may protrude from bottom.
	for (let i = 0; i < movement_lines.length; i++)
		if (movement_lines[i]?.max_y == root.max_y) {
			height += vert_space; break;
		}
	
	canvas.id = "canvas";
	canvas.width = width;
	canvas.height = height;
	ctx.fillStyle = background_color;
	ctx.fillRect(0, 0, width, height);
	ctx.strokeStyle = line_color;
	ctx.textAlign = "center";
	const x_shift = Math.floor(root.left_width + margin);
	const y_shift = Math.floor(font_size + margin);
	ctx.translate(x_shift, y_shift);
	
	root.draw(ctx, font_size, full_font, term_lines, node_color, node_terminal_color);
	for (let i = 0; i < movement_lines.length; i++)
		if (movement_lines[i]?.should_draw) movement_lines[i]?.draw(ctx, line_color);
	
	return canvas
}

function subscriptify(in_str: string): string {
	let out_str = "";
	for (let i = 0; i < in_str.length; ++i) {
		switch (in_str[i]) {
		case "0": out_str = out_str + "₀"; break;
		case "1": out_str = out_str + "₁"; break;
		case "2": out_str = out_str + "₂"; break;
		case "3": out_str = out_str + "₃"; break;
		case "4": out_str = out_str + "₄"; break;
		case "5": out_str = out_str + "₅"; break;
		case "6": out_str = out_str + "₆"; break;
		case "7": out_str = out_str + "₇"; break;
		case "8": out_str = out_str + "₈"; break;
		case "9": out_str = out_str + "₉"; break;
		}
	}
	return out_str;
}

function parse(str: string): Node {
	const n = new Node();
	
	if (str[0] != "[") { // Text node
		// Get any movement information.
		// Make sure to collapse any spaces around <X> to one space, even if there is no space.	
		str = str.replace(/\s*<(\w+)>\s*/, 
			function(_match: string, tail: string): string {
				n.tail = tail;
				return " ";
			});
		str = str.replace(/^\s+/, "");
		str = str.replace(/\s+$/, "");
		n.value = str;
		return n;
	}

	let i = 1;
	while ((str[i] != " ") && (str[i] != "[") && (str[i] != "]")) i++;
	n.value = str.substring(1, i)
	n.value = n.value.replace(/\^/, 
		function (): string {
			n.starred = true;
			return "";
		});
	n.value = n.value.replace(/_(\w+)$/,
		function(_match: string, label: string): string {
			n.label = label;
			if (n.label.search(/^\d+$/) != -1)
				return subscriptify(n.label);
			return "";
		});
	
	while (str[i] == " ") i++;
	if (str[i] != "]") {
		let level = 1;
		let start = i;
		for (; i < str.length; i++) {
			const temp = level;
			if (str[i] == "[") level++;
			if (str[i] == "]") level--;
			if (((temp == 1) && (level == 2)) || ((temp == 1) && (level == 0))) {
				if (str.substring(start, i).search(/[^\s]/) > -1)
					n.children.push(parse(str.substring(start, i)));
				start = i;
			}
			if ((temp == 2) && (level == 1)) {
				n.children.push(parse(str.substring(start, i+1)));
				start = i+1;
			}
		}
	}
	return n;
}