var readline = require('readline');
var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

function bplus() {
    var sum = 0;
    for(var i = 0; i < arguments.length; i++) {
	sum += arguments[i];
    }
    return sum;
}

function bquote (x) {
    return x;
}

function bcar (list) {
    return list[0] || [];
}

function bcdr (list) {
    return list.slice(1);
}

function bcons (car, cdr) {
    if(Array.isArray(cdr)) {
	cdr.unshift(car);
	return cdr;
    }
    return [car, cdr];
}

function evlambda (fun, args) {
    var vars = fun[1];
    var saved = {}
    // save variables
    var i;
    for(i = 0; i < vars.length-1; i++) {
	if(vars[i] != '&rest' && vars[i] != '&body' && env[vars[i]] !== undefined) {
	    saved[vars[i]] = env[vars[i]];
	}
	if(!Array.isArray(args[i]) && args[i].values !== undefined) {
	    env[vars[i]] = args[i].values[0];
	} else {
	    if(vars[i] == '&rest' || vars[i] == '&body') {
		i++;
		env[vars[i]] = args.slice(i-1, args.length-1);
		i = args.length - 1;
		break;
	    } else
		env[vars[i]] = args[i];
	}
    }

    if(i != args.length -1) {
	throw new Error("not enough arguments for function.");
    }

    
    var cur = 2;
    var result;
    for(var expr = fun[cur]; cur < fun.length-1; expr = fun[++cur]) {
	result = beval(expr);
    }
    
    // restore variables
    for(var i = 0; i < vars.length-1; i++) {
	delete env[vars[i]];
	if(saved[vars[i]] !== undefined) {
	    env[vars[i]] = saved[vars[i]];
	}
    }
    
    return result;
}

function bapply(fun, args) {
    function evlis(list) {
	var result = []
	list.forEach(function (x) {
	    var tmp = beval(x);
	    if(!Array.isArray(tmp) && tmp.values !== undefined) {
		tmp = tmp.values[0];
	    }
	    result.push(tmp);
	});
	return result;
    }


    if(typeof fun === "string") {
	fun = fenv[fun];
    }
    if(Array.isArray(fun) && fun[0] === 'macro') {
	return beval(evlambda(fun, args));
    } else {
	var args = evlis(args);
	if(typeof fun == "function") {
	    return fun.apply({}, args);
	} else if(Array.isArray(fun) && fun[0] === 'lambda') {
	    return evlambda(fun, args);
	} else {
	    throw new Error("undefined function: " + fun);
	}
    }
	
    throw new Error("apply: " + fun + ": " + args);
}

function bset(v, expr) {
    if(typeof v === "string") {
	return env[v] = expr;
    } else
	throw new Error("attempt to set non-symbol value: " + v);
}

function benv () {
    console.log(env);
    return bvalues();
}

function bfenv () {
    console.log(fenv);
    return bvalues();
}

function bprint(expr) {
    if(!Array.isArray(expr) && expr != undefined && expr.values !== undefined) {
	for(var i = 0; i < expr.values.length-1; i++) {
	    console.log(expr.values[i]);
	}
    } else {
	console.log(expr);
    }
}

function bsetf(place, value) {
    switch(place[0]) {
    case 'symbol-function':
	fenv[place[1]] = value;
    }
}

function bvalues() {
    return { 'values': Array.prototype.slice.call(arguments) };
}

function bMultipleValueBind(exprs) {
    var args = exprs[0];
    var values = beval(exprs[1]);
    var body = exprs.slice(2);

    var lambda = ['lambda', args];
    lambda = lambda.concat(body);
    return bapply(lambda, values.values);
}

function bdefmacro(expr) {
    var name = expr[0];
    var args = expr[1];
    var body = expr.slice(2);

    var macro = [ 'macro', args ];
    macro = macro.concat(body);
    fenv[name] = macro;
    return macro;
}

function bmacroexpand (expr) {
}

function bqquote(expr) {
    var result = [];
    for(var i = 0; i < expr.length; i++) {
	e = expr[i];
	if(Array.isArray(e) && e[0] === 'unquote')
	    result.push(beval(e[1]));
	else if(Array.isArray(e) && e[0] === 'unquote-splice')
	    result = result.concat(beval(e[1]).slice(0, e[1].length-1));
	else if(Array.isArray(e)) {
	    result.push(bqquote(e));
	} else
	    result.push(e);
    }
    return result;
}

function bmacroexpand(expr) {
    
}

function beval(expr) {
    if(Array.isArray(expr)) {
	var car = expr[0];
	var cdr = expr.slice(1);
	switch(car) {
	case 'quote':
	    return bquote(cdr[0]);
	case 'qquote':
	    return bqquote(cdr[0]);
	case 'lambda':
	    return expr;
	case 'setq':
	    return bset(cdr[0], beval(cdr[1]));
	case 'setf':
	    return bsetf(cdr[0], cdr[1]);
	case 'values':
	    return bvalues.apply({}, cdr);
	case 'multiple-value-bind':
	    return bMultipleValueBind(cdr);
	case 'symbol-function':
	    return fenv[cdr[0]];
	case 'defmacro':
	    return bdefmacro(cdr);
	default:
	    return bapply(car, cdr);
	}
    } else if(typeof expr === "string") {
	if(env[expr] === undefined) {
	    throw new Error("undefined symbol: " + expr);
	}
	return env[expr];
    } else {
	return expr;
    }

    throw new Error("eval error:" + expr);
}

var fenv = {
    'set': bset,
    'car': bcar,
    'cdr': bcdr,
    'cons': bcons,
    'eval': beval,
    'apply': bapply,
    'env': benv,
    'fenv': bfenv,
}


var env = {
    't': 't',
    'nil': [],
}

function isNumberThing(c) {
    return c === '0' ||
	c === '1' ||
	c === '2' ||
	c === '3' ||
	c === '4' ||
	c === '5' ||
	c === '6' ||
	c === '7' ||
	c === '8' ||
	c === '9' ||
	c === '-' ||
	c === '.';
}

function readFromString(string) {
    function terminator(c) {
	return c === undefined ||
	    c === ' ' ||
	    c === '\n' ||
	    c === '(' ||
	    c === ')';
    }

    function readSymbol (string) {
	var symbol = "";
	while(!terminator(string[0])) {
	    symbol += string[0];
	    string.shift();
	}
	return symbol;
    }

    function readNumber (string) {
	var number = "";
	var isNumber = true;
	while(!terminator(string[0])) {
	    isNumber &= isNumberThing(string[0]);
	    number += string[0];
	    string.shift();
	}
	if(isNumber)
	    return parseFloat(number);
	else
	    return number;
    }

    function readSexpr(string) {
	while(string[0] != undefined) {
	    var c = string.shift();
	    switch(c) {
	    case ' ':
	    case '\n':
	    case '\t':
		continue;

	    case '\'':
		return [ 'quote', readSexpr(string)];

	    case '`':
		return [ 'qquote', readSexpr(string)];

	    case ',':
		c = string.shift();
		if(c == '@')
		    return [ 'unquote-splice', readSexpr(string)];
		else {
		    string.unshift(c);
		    return [ 'unquote', readSexpr(string)];
		}

	    case '(': {
		var result = [];

		for(var elt = readSexpr(string); elt !== null;  elt = readSexpr(string)) {
		    result.push(elt);
		}
		result.push('nil');
		return result;
	    }

	    case ')':
		return null;

	    default:
		if(isNumberThing) {
		    string.unshift(c); 
		    return readNumber(string);
		}

		string.unshift(c);
		return readSymbol(string);
	    }
	}

	throw new Error("unterminated sexpr.");
    }

    return readSexpr(string.split(''));
}

rl.on('line', function(line) {
    try {
	bprint(beval(readFromString(line)));
    } catch(e) {
	console.error(e.stack);
	benv();
	bfenv();
    }
})
