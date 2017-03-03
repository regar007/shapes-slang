"use strict"
console.log("shapes: building a language!");


// nasic value types needed for drawing.
let number = function(v){return {t: 'number', v: v}};
let string = function(v){return {t: 'string', v: v}};
let word = function(v){return {t: 'word', v: v}};
let prim = function(fn){return {t: 'prim', v: fn}};
let symbol = function (name) {return {t: 'symbol', v: name}};

// values includes (data, program)
let run = function(env, program, pc, stack){
	for(; pc < program.length; ++pc ){
		let instr = program[pc];

		if(instr.t == 'word'){
			instr = lookup(env, instr);
		}

		switch(instr.t){
			case 'prim':
				stack = apply(instr, stack);
				break;

			default:
				push(stack, instr);
				break;
		}
	}

	return stack;
}

let mk_env = function () {
    return {}; // A new hash map for key-value associations.
};
// With such an "environment", we get a simple lookup function -
let lookup = function (env, word) {
    return env[word.v];
};
// Associate the value with the given key and returns the environment.
let define = function (env, key, value) {
    env[key] = value;
    return env;
};
// For generality, we can model primitive operations as functions on our
// stack. 
let apply = function (prim, stack) {
    return prim.v(stack);
};
// > Question: What limitations does this definition impose on
// > what a primitive function can do?
// We'll also abstract the stack operations to keep things flexible.
let push = function (stack, item) {
    stack.push(item);
    return stack;
};
let pop = function (stack) {
    return stack.pop();
};
let topitem = function (stack) {
    return stack[stack.length - 1];
};
// It is useful to look a little deeper into the stack.
// So we create another function to peek deeper than the topmost
// element.
let topi = function (stack, i) {
    return stack[stack.length - 1 - i];
};
let depth = function (stack) {
    return stack.length;
};
// For simplicity, we assume that our primitives do not throw exceptions.
// In fact, we will not bother with exceptions at all. Forget that they were
// even mentioned here!
// ### Testing our mini language
// Let's quickly write a few functions to express how we intend to run
// our programs and what we'll expect of them.
// We'll hold all our tests in a single hash table mapping the test
// name to the test function to be called.
let tests = {};
// The smoke_test function should produce a stack with a single item
// on it - the number 3.
tests.smoke = function () {
    // We start with an empty environment, load our standard library of
    // routines into it and use it to run our "program" that creates 1 and 2
    // and returns the stack with the result.
    let env = load_stdlib(mk_env());
    
    let program = [
        number(1),      // Push 1 on to the stack
        number(2),      // Push 2 on to the stack
        word('+')       // Apply '+' operation on top two elements.
    ];
    return run(env, program, 0, []);

};

// ### Displaying the stack for debugging
// A helper function to show the top n elements of the stack on the console.
// The count defaults to 20.
let show = function (stack, n) {
    n = Math.min(n || 20, depth(stack)); // Default to 20 elements.
    for (let i = 0; i < n; ++i) {
        show_item(topi(stack, i));
    }
};
let show_item = function (item) {
    switch (item.t) {
        case 'string':
            // We need to properly escape characters, so we use stringify only for strings.
            return console.log('string(' + JSON.stringify(item.v) + ')');
        default:
            // Everything else, we let the default display routine take over.
            return console.log(item.t + '(' + item.v + ')');
    }
};
// ## Standard library
// We'll choose a very basic standard library consisting of 4 arithmetic
// operations to start with. We'll expand this set, but we're too impatient
// to get to try out our new fangled "language" that we're willing to wait
// for that coolness.
let load_stdlib = function (env) {
    
    // Basic arithmetic operators for starters.
    // Note the order in which the arguments are retrieved.
    define(env, '+', prim(function (stack) {
        let y = pop(stack), x = pop(stack);
        return push(stack, number(x.v + y.v));
    }));
    define(env, '-', prim(function (stack) {
        let y = pop(stack), x = pop(stack);
        return push(stack, number(x.v - y.v));
    }));
    define(env, '*', prim(function (stack) {
        let y = pop(stack), x = pop(stack);
        return push(stack, number(x.v * y.v));
    }));
    define(env, '/', prim(function (stack) {
        let y = pop(stack), x = pop(stack);
        return push(stack, number(x.v / y.v));
    }));
    return env;
};


// ### Test distance calculation
// To calculate the distance between two points on a 2D plane,
// we need a new primitive - the square root function.
// First, a small utility to create new definitions to our 
// `load_stdlib` function. `new_defns` is expected to be
// a function that takes an environment, defines some things
// into it and returns the environment.
let stddefs = function (new_defns) {
    load_stdlib = (function (load_first) {
        return function (env) {
            return new_defns(load_first(env)) || env;
        };
    }(load_stdlib));
};
// Augment our "standard library" with a new 'sqrt' primitive function.
stddefs(function (env) {
    // We'll not be able to express x * x without the
    // ability to duplicate the top value on the stack.
    // We could also create 'pow' as a primitive for that
    // specific case.
    define(env, 'dup', prim(function (stack) {
        return push(stack, topitem(stack));
    }));
    define(env, 'drop', prim(function (stack) {
        pop(stack);
        return stack;
    }));
    define(env, 'sqrt', prim(function (stack) {
        let x = pop(stack);
        return push(stack, number(Math.sqrt(x.v)));
    }));
    return env;
});

// `def` associates a symbol with a value.
stddefs(function (env) {
    define(env, 'def', prim(function (stack) {
        let sym = pop(stack), val = pop(stack);
        console.assert(sym.t === 'symbol');
        define(env, sym.v, val);
        return stack;
    }));
});



// We always want the standard library for tests, so simplify it
// with a function.
let test_env = function () {
    return load_stdlib(mk_env());
};
// Now we can finally calculate the distance between two points.
tests.distance = function (x1, y1, x2, y2) {
    let program = [
        number(x1),     // Store x1
        number(x2),     // Store x2
        word('-'),      // Take the difference
        word('dup'),    // 'dup' followed by '*' will square it.
        word('*'),
        number(y1),     // Store y1
        number(y2),     // Store y2
        word('-'),      // Take the difference
        word('dup'),    // 'dup' followed by '*' will square it.
        word('*'),      
        word('+'),      // Sum of the two squares.
        word('sqrt')    // The square root of that.
    ];
    return run(test_env(), program, 0, []);
};

tests.distance2 = function (stack) {
    let program = [
        /* Name and consume 4 arguments from stack. */
        symbol('y2'), word('def'),
        symbol('x2'), word('def'),
        symbol('y1'), word('def'),
        symbol('x1'), word('def'),
        /* Calc square of x1 - x2 */
        word('x1'), word('x2'),
        word('-'), word('dup'), word('*'),
        /* Calc square of y1 - y2 */
        word('y1'), word('y2'),
        word('-'), word('dup'), word('*'),
        /* Sum and sqroot. */
        word('+'),
        word('sqrt')
    ];
    return run(test_env(), program, 0, stack);
};



// running my show
let svgns = "http://www.w3.org/2000/svg";

let circle = function(x, y, r, color){return {t:'circle', cx: x, cy: y, r: r, fill: color, rot: number(0), bindings: {parent: [], children: []}}};
let rectangle = function(x, y, width, height, color){return {t:'rect', x: x, y: y, width: width, height: height, fill: color, rot: number(0), bindings : {parent: [], children: []}}};

stddefs(function (env) {
    define(env, 'show', prim(function (stack) {
        let str = pop(stack);
        let data = document.getElementById('myData');
        myData.innerHTML += "<p>"+str.v+"</p> \t";
        console.log(str.v);
        return stack;
    }));

    /*
    define(env, 'proj', prim(function(stack){
        let id = pop(stack).v, ang = pop(stack).v, vel = pop(stack).v;
        let svg = document.getElementById(id);
        let stepOffset = 0;
        const g = 9.8, steps = 100;
        let sin = Math.sin(ang * (Math.PI / 180));
        let dist = (vel * vel * sin)/ g;
        let halfTimeOfFlight = vel * sin / g;
        let finalSteps = dist * vel * Math.sin(ang * 2 * (Math.PI / 180));
        let halfFinalSteps = (finalSteps/2);
        let ratioFinder = halfTimeOfFlight / ((halfFinalSteps * (halfFinalSteps + 1))/2);
        let offset = 1;

 
        for (var i = 0; i < Math.floor(finalSteps); i++) {
           (function(idx){
                let i = idx;
                let isGoingDown = false;
                let time = ratioFinder * ( i * (i + 1)/ 2);
                let sec = i;
                let pospone = 0;
                if(idx > halfFinalSteps){
                    pospone = (ratioFinder * ( halfFinalSteps * (halfFinalSteps + 1)/2));
                    i = idx - offset;
                    time = ratioFinder * ( i * (i + 1)/ 2);
                    offset = offset + 2;
                    isGoingDown = true;
                    return;
                }
                //setTimeout(project(i, time), time * 1000);
                setTimeout(function(){
                    let t = time;

                    let _x = vel * t;
                    let _y = (vel * sin * t) - (0.5 * g * t * t);
                    if(!isGoingDown){
                        _y = - _y;
                    }
                    
                    let x = env[id].x.v + _x;
                    let y = env[id].y.v + _y;
                    
                    svg.setAttribute('x', x);
                    svg.setAttribute('y', y);
                    svg.setAttribute('transform', "rotate("+ env[id].rot.v + ","+ x + ","+ y +")");
                    env[id].x.v = x;
                    env[id].y.v = y; 
                }, (time + pospone) * 1000);
           })(i);
        }

        return stack;        
    }));
    */

    define(env,'pin',prim(function (stack) {
        let id = pop(stack).v, x = pop(stack), y = pop(stack);
        let svg = document.getElementById(id);
        let shape = env[id];
        let attr = Object.keys(shape);

        let p = shape.bindings.parent;
        if(p.length == 0){
            p.push(id);
        }
        for(var i = 0; i < p.length; i++){
            let currP = env[p[i]];
            let currEle = document.getElementById(p[i]);
            let currAttr = Object.keys(currP);
            currEle.setAttribute(currAttr[1], x.v);
            currEle.setAttribute(currAttr[2], y.v);
            currEle.setAttribute('transform', "rotate("+ currP.rot.v + ","+ x.v + ","+ y.v +")");
            env[p[i]][currAttr[1]].v = x.v;
            env[p[i]][currAttr[2]].v = y.v;


            let b = currP.bindings.children;
            for(var i = 0; i < b.length; i++){
                let renderProgram = [];
                renderProgram.push(string(b[i]));
                renderProgram.push(word('render'));
                run(env, renderProgram, 0, []); 
            }
        }

        return stack;
    }));

    define(env, 'modify', prim(function(stack){
        let id = pop(stack);
        //let inputs = [pop(stack), pop(stack), pop(stack), pop(stack)];
        
        let shape = env[id.v];
        let attr = Object.keys(shape);
        let noOfInputs = 0;
        if(shape.t == 'rect'){
            noOfInputs = 4;
        }else{
            noOfInputs = 3;
        }
        for(var i = 0; i < noOfInputs; i++){
            shape[attr[i + 1]].v = pop(stack).v;
        }
        stack.push(shape);
        stack.push(string(id.v));
        return stack;
    }))

    define(env,'rotate',prim(function (stack) {
        let id = pop(stack).v, ang = pop(stack).v;

        let p = env[id].bindings.parent;
        let pX = 0;
        let pY = 0;
        let pA = 0;
        if(p.length > 0){
            let i =0;            
            // id = p[i];
            pX = env[p[i]].x.v;
            pY = env[p[i]].y.v;
            pA = env[p[i]].rot.v;
        }
        let c = env[id].bindings.children;
        let gId = id;
        if(c.length > 0){
            for(var i = 0; i < c.length; c++){
                gId += c[i];
            }
        }
        //for(var i =0; i < p.length; i++)
        {
            //id = p[i];
            let svg = document.getElementById(gId);

            if(stack.length === 0){
                let half_w = env[id].width.v/2 + env[id].x.v + pX, half_h =  env[id].height.v/2 + env[id].y.v + pY;
                let finalAngle = ang + env[id].rot.v;
                svg.setAttribute( 'transform', "rotate("+ finalAngle+ ","+ half_w + ","+ half_h + ")");
                env[id].rot.v += ang;
                if(env[id].accLoop && env[id].accLoop > 0){
                    clearInterval(env[id].accLoop);
                }            

                // rotate binded shapes
                // let b = env[id].bindings.children;
                // for(var i = 0; i < b.length; i++){
                //     let child = document.getElementById(b[i]);
                //     child.setAttribute( 'transform', "rotate("+ finalAngle+ ","+ half_w + ","+ half_h + ")");
                // }
            }else{
                let accleration = pop(stack).v;
                ang *= (accleration > 0) ? 1 : -1;
                let accLoop = (accleration == 0) ? null : setInterval(function(){
                    let half_w = env[id].width.v/2 + env[id].x.v + pX, half_h =  env[id].height.v/2 + env[id].y.v + pY;
                    let finalAngle = ang + env[id].rot.v;
                    svg.setAttribute( 'transform', "rotate("+ finalAngle+ ","+ half_w + ","+ half_h + ")");
                    env[id].rot.v += ang;

                    // rotate binded shapes
                    // let b = env[id].bindings.children;
                    // for(var i = 0; i < b.length; i++){
                    //     let child = document.getElementById(b[i]);
                    //     child.setAttribute( 'transform', "rotate("+ finalAngle+ ","+ half_w + ","+ half_h + ")");
                    // }

                }, 1000 / Math.abs(accleration));
                if(env[id].accLoop > 0){
                    clearInterval(env[id].accLoop);
                }
                env[id].accLoop = accLoop;
            }
        }

        return stack;
    }));
    define(env,'move',prim(function (stack) {
        let id = pop(stack).v, xAcc = pop(stack).v, yAcc = pop(stack).v;
        let c = env[id].bindings.children;
        let gId = id;
        if(c.length > 0){
            for(var i = 0; i < c.length; c++){
                gId += c[i];
            }
        }
        let svg = document.getElementById(id);
        let shape = env[id];
        let attr = Object.keys(shape);
        let transX = (xAcc > 0) ? 1 : - 1, transY = (yAcc > 0) ? 1: -1;

        if(stack.length === 0){
            let transXLoop = (xAcc === 0) ? null : setInterval(function(){
                let X = env[id][attr[1]].v + transX;
                svg.setAttributeNS(null, attr[1], X);
                env[id][attr[1]].v = X;
                // let translateStr = svg.getAttribute("transform");
                // let re = /\((.*)\)/i;
                // let x = translateStr.match(re)[1].split(',').map(parseFloat);
                // let X = x[0] + transX;
                // svg.setAttributeNS(null, 'transform', "translate("+ X +"," + env[id].y.v + ")");

                // render binded shapes for current shape
                let b = shape.bindings.children;
                for(var i = 0; i < b.length; i++){
                    let renderProgram = [];
                    renderProgram.push(string(b[i]));
                    renderProgram.push(word('render'));
                    run(env, renderProgram, 0, []); 
                }
            }, 1000 / Math.abs(xAcc));
            let transYLoop = (yAcc === 0) ? null : setInterval(function(){
                let Y = env[id][attr[2]].v + transY;
                svg.setAttributeNS(null, attr[2], Y);
                env[id][attr[2]].v = Y; 

                // render binded shapes for current shape
                let b = shape.bindings.children;
                for(var i = 0; i < b.length; i++){
                    let renderProgram = [];
                    renderProgram.push(string(b[i]));
                    renderProgram.push(word('render'));
                    run(env, renderProgram, 0, []); 
                }
            }, 1000 / Math.abs(yAcc));
            if(env[id].transLoop && env[id].transLoop.length > 0){
                clearInterval(env[id].transLoop[0]);
                clearInterval(env[id].transLoop[1]);
            }
            env[id].transLoop = [transXLoop, transYLoop];
        }else{
        }
        return stack;
    }));

    define(env,'stop',prim(function (stack) {
        let id = pop(stack).v;

        // if parent exist for this shape then stop parents movements.
        let p = env[id].bindings.parent;
        if(p.length > 0){
            id = p[0];
        }

        clearInterval(env[id].accLoop);
        clearInterval(env[id].transLoop[0]);
        clearInterval(env[id].transLoop[1]);
        return stack;
    }));


    define(env, 'add', prim(function (stack) {
        let id = pop(stack).v, shape = pop(stack);
        let attr = Object.keys(shape);

		if(shape.t == 'circle'){	
            let circle = document.getElementById(id);
            if(!circle){
                circle = document.createElementNS(svgns, shape.t); 
            }
	  	    circle.setAttributeNS(null, 'id', id);
            for(var i = 1; i < attr.length - 3; i++ ){
                circle.setAttributeNS(null, attr[i], shape[attr[i]].v);
            }
			circle.setAttributeNS(null, 'stroke', shape.fill.v);
			circle.setAttributeNS(null, 'stroke-width', 2);
			document.getElementById('svgHolder').appendChild(circle);		
		}else if(shape.t == 'rect'){
	  	    let rect = document.getElementById(id);
            if(!rect){
                rect = document.createElementNS(svgns, 'rect');
            }
	  	    rect.setAttributeNS(null, 'id', id);
            for(var i = 1; i < attr.length - 3; i++ ){
                rect.setAttributeNS(null, attr[i], shape[attr[i]].v);
            }
			document.getElementById('svgHolder').appendChild(rect);
            // let div = document.createElement('span');
            // div.innerHTML = id;
            // rect.appendChild(div);            		
		}
        return stack;
    }));

    define(env, 'remove', prim(function(stack){
        let id = pop(stack).v;
        let bindings = env[id].bindings;
        let htmlParentTag = 'svgHolder';

        // remove the binding from its parent.
        let p = bindings.parent;
        let tempId = "";
        for(var i = 0; i < p.length; i++){
            tempId += p[i];
            let c = env[p[i]].bindings.children;
            let index = c.indexOf(id);
            if(index > -1){
                c.splice(index, 1);
            }
            env[p[i]].bindings.children = c;

            document.getElementById('svgHolder').appendChild(document.getElementById(p[i]));
        }
        if(p.length > 0){
            htmlParentTag = tempId + id;
        }

        // remove the binding from its children.
        let c = bindings.children;
        if(c.length > 0){
            htmlParentTag = id;
        }
        for(var i = 0; i < c.length; i++){
            htmlParentTag += c[i]; 
            let p = env[c[i]].bindings.parent;
            let index = p.indexOf(id);
            if(index > -1){
                p.splice(index, 1);
            }
            env[c[i]].bindings.children = p;
            env[c[i]].x.v = env[c[i]].x.v + env[id].x.v;
            env[c[i]].y.v = env[c[i]].y.v + env[id].y.v;

            document.getElementById('svgHolder').appendChild(document.getElementById(c[i]));
        }

        delete env[id];
        let cShape = document.getElementById(id);
        let tag = document.getElementById(htmlParentTag);
        if(htmlParentTag !== 'svgHolder'){
            tag.removeChild(cShape);       
            tag.parentNode.removeChild(tag);
        }
        return stack;
    }));

    define(env, 'bind', prim(function(stack){
        let s1 = pop(stack), s2 = pop(stack);
        let x = pop(stack), y = pop(stack);

        let parent = env[s1.v], child = env[s2.v];
        let cAttr = Object.keys(child);
        let pAttr = Object.keys(parent);
        if(typeof(parent) != undefined && typeof(child) != undefined){
            // child[cAttr[1]].v = parent[pAttr[1]].v + x.v;
            // child[cAttr[2]].v = parent[pAttr[2]].v + y.v;
            child[cAttr[1]].v = x.v;
            child[cAttr[2]].v = y.v;
        }
        if(env[s1.v]['bindings'].children.indexOf(s2.v) == -1){
            env[s1.v]['bindings'].children.push(s2.v);
            env[s2.v]['bindings'].parent.push(s1.v);

            // group both shapes in <g> tag of svg
            let g = document.createElementNS(svgns, "g");
            g.setAttributeNS(null, 'id', ""+s1.v + s2.v);
            g.setAttributeNS(null, "stroke", "green");
            g.setAttributeNS(null, "fill", "black");
            g.setAttributeNS(null, "stroke-width", 5);
            document.getElementById('svgHolder').appendChild(g);
            g.appendChild(document.getElementById(s1.v));
            g.appendChild(document.getElementById(s2.v));
        }
        
        stack.push(s2);
        stack.push(word('render'));
        return run(env, stack, 0, []);
    }));

    define(env, 'render', prim(function(stack){
        let name = pop(stack);
        let shape = env[name.v];
        let htmlParentTag = 'svgHolder';

        let b = shape.bindings.parent;
        let attr = Object.keys(shape);
        if(typeof(shape) != undefined && typeof(child) != undefined){
            let ren = document.getElementById(name.v);
            let x = shape[attr[1]].v, y = shape[attr[2]].v;
            if(b.length > 0){
                htmlParentTag = ''+ b[0] + name.v;
                let bAttr = Object.keys(env[b[0]]);
                shape[attr[1]].v += env[b[0]][bAttr[1]].v; 
                shape[attr[2]].v += env[b[0]][bAttr[2]].v; 
                ren.setAttribute( 'transform', "rotate("+ shape.rot.v+ ","+ shape[attr[1]].v + ","+ shape[attr[2]].v + ")");
            }
            for(var i = 0; i < attr.length; i++ ){
                ren.setAttributeNS(null, attr[i], shape[attr[i]].v);
            }
            document.getElementById(htmlParentTag).appendChild(ren);       
            if(b.length > 0){
                shape[attr[1]].v = x; 
                shape[attr[2]].v = y; 
            }
        }
        return stack;
    }));
});

let instr_parser = function(str, prog){
	let s = str.split(" ");
    let inputs = str.replace(/^\s+|\s+$/g, '').match( /[-]{0,1}[\d.]*[\d]+/g, '');
    if(inputs != null){
        inputs = inputs.map(parseFloat);
    }

	if(s[0] === "add"){
    	if(s[1] === "circle"){
            // create a primitive circle which holds the data for new circle
			prog.push(circle(number(inputs[0]), number(inputs[1]), number(inputs[2]), string('black')));
		}else if(s[1] === "rect"){
            // create a primitive rectangle which holds the data for new rectangle
			prog.push(rectangle(number(inputs[0]), number(inputs[1]), number(inputs[2]), number(inputs[3]), string('black')));
		}
		prog.push(symbol(s[2]));
		prog.push(word('def'));
		prog.push(word(s[2]));
        prog.push(string(s[2]));
		prog.push(word(s[0]));
	}
	else if(s[0] === 'remove'){
        // removes a shape (remove "name" ) 
		prog.push(string(s[1]));
		prog.push(word(s[0]));
	}
	else if(s[0] === 'pin'){
        // assume if we are using pin then some shape already exists and
        // we are trying to move it..
        prog.push(number(parseFloat(s[3])));
        prog.push(number(parseFloat(s[2])));
        prog.push(string(s[1]));
        prog.push(word(s[0]));

    }else if(s[0] === 'rotate'){
        for (var i = inputs.length - 1; i >= 0; i--) {
            prog.push(number(inputs[i]));
        }
        prog.push(string(s[1]));
        prog.push(word(s[0]));
    }
    else if(s[0] === 'stop'){
        prog.push(string(s[1]));
        prog.push(word(s[0]));
    }else if(s[0] == 'move'){
        let xAcc = parseFloat(s[2]);
        let yAcc = parseFloat(s[3])
        prog.push(number(yAcc));
        prog.push(number(xAcc));
        
        prog.push(string(s[1]));
        prog.push(word(s[0]));
    }else if(s[0] === 'proj'){
        prog.push(number(s[3]));
        prog.push(number(s[2]));
        prog.push(string(s[1]));
        prog.push(word(s[0]));
    }else if(s[0] === 'modify'){
        prog.push(number(parseFloat(s[5])))
        prog.push(number(parseFloat(s[4])))
        prog.push(number(parseFloat(s[3])))
        prog.push(number(parseFloat(s[2])))
        prog.push(string(s[1]))
        prog.push(word(s[0]));
        prog.push(word('add'))
    }else if(s[0] === 'bind'){
        prog.push(number(inputs[1]));
        prog.push(number(inputs[0]));
        prog.push(string(s[1]));
        prog.push(string(s[2]));
        prog.push(word(s[0]));
    }
	return prog;
}

let env = load_stdlib(mk_env());

tests.myShow = function(prog){

    let program = prog || [
    	string("hello folks! Open shapes_slang.html to play with the framework."),
    	word('show'),
    ];

    // return run(env, p2, 0, [circle(10), rectangle(100, 150)]);
    return run(env, program, 0, []);

}

let stack1 = [];
function addToStack(event){
	if(event.keyCode == 13) {
		 let str = document.getElementById(event.target.id).value;
		 let prog = instr_parser(str, []);
		 tests.myShow(prog);
    }
}





