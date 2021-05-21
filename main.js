/*
TODO:
- Add more units
*/

let units;
let player;
let new_player;

async function load() {
	await createVars();

	// try to load from local storage
	// if it doesnt work make new player
	if ((player = JSON.parse(localStorage.getItem("unit-savegame"))) == null) {
		player = {
			...new_player
		};
	}
	loadVue();
}

function save() {
	localStorage.setItem("unit-savegame", JSON.stringify(player));
}

async function createVars() {
	// read json
	const r = await fetch('./units.json');
	units = await r.json();

	// make easily usable object of base units rather than the annoying (but compact) string
	for (let unit of units) {
		unit[3] = {};
		// for every unit, turn the base unit str into a base unit obj such that
		// kg m2 s-3 A-1 would become {kg:1, m:2, s:-3, A:-1}


		// split str into arr
		if (unit[2] == undefined) debugger
		let base_units = unit[2].split(' ');
		// split into letter and number
		for (let i = 0; i < base_units.length; i++) {
			if (unit[2].includes('/')) {
				unit[3] = null;
				continue;
			}

			// ie if the base unit is kg-2 this'll give -, the first number
			let firstDigit = base_units[i].match(/(\d|-)/);
			// eg in kg-2, itll give kg, 2. Just add the firstDigit to the latter and its split
			// the 2 is for max amount of segments, which is probably unnessessary,
			// but will fix it if its eg s-11 (which would be crazy)
			// if its just s then the number is assumed to be 1
			if (firstDigit == null) {
				unit[3][base_units[i]] = 1;
			} else {
				let segments = base_units[i].split(firstDigit[0], 2);
				unit[3][segments[0]] = parseInt(firstDigit[0] + segments[1]);
			}
		}
	}



	// the starting save of a player
	new_player = {
		"units": [
			units[0],
			units[1],
			units[2],
			...Array(units.length - 3).fill(null)
		],
		"derived_unit_num": 0,
		"start_time": Date.now(),
		"slot1": null,
		"slot2": null,
		"product": null,
		"operation": "X"
	}
}

function clickedUnit(unit, location, slotnum) {
	// if inventory clicked
	if (location == 'inventory') {
		// add into slot 1 if its empty
		if (player.slot1 == null) {
			player.slot1 = unit;

			// if theres a unit in the slot 2, draw the product
			if (player.slot2 != null) {
				findProduct(player.slot1, player.slot2);
			}

			// else move into slot 2 and draw the product if it exists
		} else if (player.slot2 == null) {
			player.slot2 = unit;

			// find product
			findProduct(player.slot1, player.slot2);
		}
		// else fusion clicked
	} else {
		// remove from slot 1
		if (slotnum == 'slot1') {
			player.slot1 = null;
			player.product = null;
			// or remove from slot 2
		} else if (slotnum == "slot2") {
			player.slot2 = null;
			player.product = null;
			// remove product
		} else {
			if (!player.units.map(u => !u || u[0]).includes(player.product[0]) && player.slot1 && player.slot2) {
				player.units[units.map(u => u[0]).indexOf(player.product[0])] = player.product;
				player.derived_unit_num++;
				player.product = null;
				player.slot1 = null;
				player.slot2 = null;

				if (player.derived_unit_num % 3 == 0) {
					// fancy formula to get 1 more base units
					let base_unit_num = player.units.filter(u => u && u[0]).length - player.derived_unit_num;
					if (base_unit_num < 7) {
						// player.units.push(units[base_unit_num]);
						player.units[units.map(u => u[0]).indexOf(units[base_unit_num][0])] = units[base_unit_num];
					}
				}

				save()
			}
		}

	}
}

let debug = false;

function findProduct(a, b) {


	if (debug) {
		debugger;
	}

	if (a[1] == "m" && b[2] == "m" && player.operation == '/') {
		player.product = units[8];
		return;
	}
	if ((a[0] == 'Area' && b[0] == 'Area' && player.operation == '/') ||
		(a[1] == 'rad' && b[1] == 'rad' && player.operation == 'X')) {
		player.product = units[9]; // solid angle
		return;
	}
	if (a[1] == 'rad' && b[1] == 's' && player.operation == '/') {
		player.product = units[44]; // angular velocity
	}
	if (a[0] == 'Angular velocity' && b[1] == 's' && player.operation == '/') {
		player.product = units[44]; // angular acceleration
	}



	// if its a natural number
	if (a[3] == null) {
		a[3] = {};
	} else if (b[3] == null) {
		b[3] = {};
	}

	let a_keys = Object.keys(a[3]);
	let b_keys = Object.keys(b[3]);
	let product_base_units = {};
	let union = [...new Set([...a_keys, ...b_keys])];
	for (let base_unit of union) {
		// if multiplying, add the indexes
		if (player.operation == 'X') {
			var number = (a[3][base_unit] || 0) + (b[3][base_unit] || 0);
		} else {
			// if dividing, subtract the indices
			var number = (a[3][base_unit] || 0) - (b[3][base_unit] || 0);
		}
		if (number != 0) {
			product_base_units[base_unit] = number;
		}
	}

	if (Object.keys(product_base_units) == 0) {
		// if obj is empty
		player.product = units[7];
	}

	for (let unit of units) {
		// fake way of determining equality of objs, why doesnt js just do this automatically
		// I should use lodash
		// and I need to sort them into alphabetical order because json stringify sorts them based on 
		// the time of creation of each key-value pair

		// if its dimensionless
		if (unit[3] == null) {
			continue;
		}

		if (JSON.stringify(product_base_units, Object.keys(product_base_units).sort()) ==
			JSON.stringify(unit[3], Object.keys(unit[3]).sort())) {
			player.product = unit;
			return;
		}
	}
}

function swapOperation() {
	if (player.operation == 'X') {
		player.operation = '/';
	} else {
		player.operation = 'X';
	}

	if (player.slot1 && player.slot2) findProduct(player.slot1, player.slot2);
}

function unitAbbrevSize(text) {
	debugger;
	let tester = document.getElementById('widthTester');
	tester.innerHTML = text;
	let width = tester.offsetWidth;
	// max length in pixels is 60, after that it looks bad, make it smaller
	// so calculate what the multiplyer has to be in order to get it to 60 pixels
	// but if its to make it bigger, cap it at 300%
	let factor = 50 / width
	return Math.min(factor * 100, 300) + '%';
}

// copy paste to resize the divs
interact('#fusion')
	.resizable({
		edges: {
			right: true,
		},

		listeners: {
			move(event) {
				var target = event.target
				var x = (parseFloat(target.getAttribute('data-x')) || 0)
				var y = (parseFloat(target.getAttribute('data-y')) || 0)

				// update the element's style
				target.style.width = event.rect.width + 'px'

				target.setAttribute('data-x', x);

				let div = document.querySelector("#fusion");
				let content = document.querySelector("#crafting");
				// debugger;
				// max 1, so it doesnt get any bigger than default
				scale = Math.min(
					parseInt(window.getComputedStyle(div).width) /
					parseInt(window.getComputedStyle(content).width),
					1
				);
				content.style.transform = `translate(-50%, 0) scale(${scale})`;

				// resize inv
				let width = parseInt(window.getComputedStyle(document.body).width);
				let inventory = document.querySelector("#inventory");
				// make inventory the full size minus the fusion panel
				inventory.style.width = (((width) - parseInt(div.style.width) - 5) / width * 100) + "%";
				console.log((((width) - parseInt(div.style.width) - 5) / width * 100) + "%");

				// minus 15 just for padding and margins and things just in case
			}
		},
		modifiers: [
			// keep the edges inside the parent
			interact.modifiers.restrictEdges({
				outer: 'parent'
			}),

			// minimum size
			interact.modifiers.restrictSize({
				min: {
					width: 100,
				},
				max: {
					width: parseInt(window.getComputedStyle(document.body).width) - 150,
				}
			})
		],

		inertia: true
	})