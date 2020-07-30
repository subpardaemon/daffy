const commandLineArgs = require('command-line-args');
const commandLineUsage = require('command-line-usage');
const fs = require("fs");

function usage() {
	const usage = commandLineUsage([{ header: 'daffy-upload.js', content: 'A CSV/JSON dataset file uploader for the daffy server.' }, { header: 'Options', optionList: opts_def }]);
	console.log(usage);
	process.exit(0);
}

const opts_def = [
	{ name: 'file', type: String, alias: 'f', defaultValue: '', description: 'The CSV/JSON file to send', typeLabel: '<path>' },
	{ name: 'repeats', type: Number, alias: 'r', defaultValue: 1, description: 'Number of times the dataset can be reused', typeLabel: '<n>' },
	{ name: 'id', type: String, alias: 'i', defaultOption: true, defaultValue: '?', description: 'The dataset ID to use', typeLabel: '<id>' },
	{ name: 'host', type: String, alias: 'H', defaultValue: 'localhost', description: 'Hostname of the daffy server', typeLabel: '<hostname>' },
	{ name: 'port', type: Number, alias: 'P', defaultValue: 8033, description: 'Port of the daffy server', typeLabel: '<port>' },
	{ name: 'secure', type: Boolean, alias: 's', defaultValue: false, description: 'Use https instead of http' },
	{ name: 'help', type: Boolean, alias: 'h', defaultValue: false, description: 'Display this help.' }
	];

const opts = commandLineArgs(opts_def);

if (opts.help) {
	usage();
}

const proto = (opts.secure) ? "https:" : "http:";
const http = (opts.secure) ? require('https') : require('http');
const hostname = opts.host;
const port = opts.port;
const repeat = opts.repeats;
if (repeat < 1 || repeat > 512) {
	repeat = 1;
}
const id = (opts.id==='?') ? 'AUTOID'+ Date.now().toString() : opts.id;

try {
	fs.accessSync(opts.file, fs.constants.R_OK);
}
catch(e) {
	console.error("Upload file " + opts.file + " is not readable, aborting.");
	usage();
}
console.log("Reading: " + opts.file + "...");
const fi = fs.readFileSync(opts.file);
const uptype = (fi.toString().substr(0,1) === '[') ? 'application/json' : 'text/csv';
const uppath = '/' + id + '/' + repeat.toString();

console.log("Uploading to: " + proto + "//" + hostname + ":" + port + uppath + "...");
const req = http.request({
	protocol: proto,
	hostname: hostname,
	port: port,
	method: 'POST',
	path: uppath,
	headers: { 'Content-Type': uptype }
},function(res) {
	let resp = "";
	res.setEncoding('utf8');
	res.on('data', (chunk) => {
		resp += chunk;
	});
	res.on('end', () => {
		console.log("Result: " + res.statusCode.toString() + " " + resp);
		process.exit(0);
	});
});

req.on("error", (e) => {
	console.error("Upload failed, see error:");
	console.error(e);
	process.exit(1);
});
req.end(fi);
