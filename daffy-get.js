const commandLineArgs = require('command-line-args');
const commandLineUsage = require('command-line-usage');
const fs = require("fs");

function usage() {
	const usage = commandLineUsage([{ header: 'daffy-get.js', content: 'Pull the next item from a daque server.' },{header: 'Options',optionList: opts_def}]);
	console.log(usage);
	process.exit(0);
}

const opts_def = [
	{name:'id',type:String,alias:'i',defaultOption:true,defaultValue:'?',description:'The dataset ID to use',typeLabel:'<id>'},
	{name:'host',type:String,alias:'H',defaultValue:'localhost',description:'Hostname of the daque server',typeLabel:'<hostname>'},
	{name:'port',type:Number,alias:'P',defaultValue:8033,description:'Port of the daque server',typeLabel:'<port>'},
	{name:'secure',type:Boolean,alias:'s',defaultValue:false,description:'Use https instead of http'},
	{name:'help',type:Boolean,alias:'h',defaultValue:false,description:'Display this help.'}
	];

const opts = commandLineArgs(opts_def);

if (opts.help) {
	usage();
}

const proto = (opts.secure) ? "https:" : "http:";
const http = (opts.secure) ? require('https') : require('http');
const hostname = opts.host;
const port = opts.port;

if (opts.id==='?' || opts.id==='') {
	usage();
}
const path = '/next?'+opts.id;

const req = http.request({
	protocol:proto,
	hostname:hostname,
	port:port,
	method:'GET',
	path:path,
},function(res) {
	let resp = "";
	res.setEncoding('utf8');
	res.on('data', (chunk) => {
		resp += chunk;
	});
	res.on('end', () => {
		if (res.statusCode<300) {
			console.log(resp);
			process.exit(0);
		}
		else if (res.statusCode===403) {
			console.error("Dataset "+opts.id+" is exhausted.");
			process.exit(1);
		}
		else if (res.statusCode===404) {
			console.error("Dataset "+opts.id+" not found.");
			process.exit(2);
		}
		else {
			console.error("Error: "+res.statusCode.toString()+" "+resp);
			process.exit(3);
		}
	});
});

req.on("error", (e) => {
	console.error("Communication error:");
	console.error(e);
	process.exit(4);
});
req.end();
