// "I'm so crazy I don't know this isn't possible." - DD

const http = require("http");
const csvparse = require('csv-parse/lib/sync');
const fs = require("fs");

function usage() {
	const usage = commandLineUsage([
		{ header: 'daffy.js', content: 'A simple data queue server.' },
		{ header: 'Options', optionList: opts_def },
		{ header: 'Operations', content: "You may communicate with the server on these paths:\n\n  /next?<ID> : fetch the next item in dataset <ID>\n  /list : lists the current datasets, their count, repeat and current index\n  /upload?<ID>&<repeat> : upload a new dataset" },
		{ header: 'Uploading', content: "* you need to POST to /upload?<ID>&<repeat>;\n* you need to specify either text/csv or application/json as Content-Type;\n* CSV files may use , or ; as delimiter;\n* CSV files must use the first line for column names;\n* JSON files must use an array as the outermost container;\n* you must not encode upload other than current CSV or JSON encoding." }
	]);
	console.log(usage);
	process.exit(0);
}


const port = process.env.DAFFY_PORT || 8033;

const s = {
	data: {},
	pointers: {},
	counts: {},
	http: null,
	init: function () {
		s.http = http.createServer();
		s.http.listen(port);
		s.http.on('error', function (err) {
			console.error(err);
		}.bind(this));
		s.http.on('request', function (req, resp) {
			const parts = req.url.substr(1).split('/');
			if (req.method === 'GET') {
				if (parts[0] === 'list') {
					const out = {
						datasets: []
					};
					Object.keys(s.data).forEach(function (n) {
						out.datasets.push({
							id: n,
							items: s.data[n].length,
							repeat: s.counts[n],
							index: s.pointers[n]
						});
					});
					s.send_json(resp, out);
				}
				else if (parts.length > 1 && parts[1] === 'next') {
					if (!s.check_id(parts[0])) {
						s.send_failure(resp, "Bad dataset ID", 400);
					}
					else if (typeof s.data[parts[0]] === 'undefined') {
						s.send_failure(resp, "No such dataset", 404);
					}
					else {
						if (parts.length > 2 && parsetInt(parts[2]) > 0) {
							const out = [];
							let rows = parsetInt(parts[2]);
							while (rows > 0) {
								const d = s.serve_next(parts[0]);
								if (d === null) {
									rows = 0;
								} else {
									out.push(d);
									--rows;
								}
							}
							if (out.length === 0) {
								s.send_failure(resp, "No more records", 403);
							} else {
								s.send_json(resp, out);
							}
						} else {
							const d = s.serve_next(parts[0]);
							if (d === null) {
								s.send_failure(resp, "No more records", 403);
							} else {
								s.send_json(resp, d);
							}
						}
					}
				}
				else {
					s.send_failure(resp, "Unknown command", 404);
				}
			}
			else if (req.method === 'POST' || req.method === 'PUT') {
				const append = req.method === 'PUT';
				if (!s.check_id(parts[0])) {
					s.send_failure(resp, "Bad dataset ID", 400);
				}
				else {
					const id = parts[0];
					const counts = (parts.length > 1 && parseInt(parts[1]) > 0) ? parseInt(parts[1]) : 1;
					let body = '';
					req.on('data', function (chunk) {
						body += chunk;
					}).on('end', function () {
						let ingest = 'json';
						let sep = '';
						if (typeof req.headers['content-type'] !== 'undefined') {
							if (req.headers['content-type'].includes('text/csv')) {
								ingest = 'csv';
								sep = (body.indexOf(';') > -1 && body.indexOf(';') < body.indexOf(',')) ? ';' : ',';
							}
						}
						try {
							s.add_dataset(
								id,
								(ingest === 'csv')
									? csvparse(body, { columns: true, skip_empty_lines: true, delimiter: sep })
									: JSON.parse(body),
								counts,
								append
							);
							s.send_json(resp, {
								status: 'OK',
								id: id,
								items: s.data[id].length,
								repeat: counts
							});
						}
						catch (e) {
							s.send_failure(resp, "Incorrect request (parse failed)", 405);
							console.error('Parse error:', e);
						}
					}).on('error', function () {
						s.send_failure(resp, "Incorrect request", 405);
					});
				}
			}
			else {
				s.send_failure(resp, "Bad request", 400);
			}
		}.bind(this));
		console.info("DAFFY listening on port " + port.toString());
	},
	check_id: function (id) {
		return id.match(/^[a-zA-Z0-9_:,-]+$/) !== null;
	},
	add_dataset: function (id, dataset, maxfetch, append) {
		if (append) {
			s.data[id] = s.data[id].concat(dataset);
			s.counts[id] = maxfetch;
		} else {
			s.data[id] = dataset;
			s.pointers[id] = 0;
			s.counts[id] = maxfetch;
		}
	},
	serve_next: function (id) {
		if (typeof s.pointers[id] === 'undefined') {
			return null;
		}
		if (s.pointers[id] >= s.data[id].length) {
			--s.counts[id];
			if (s.counts[id] === 0) {
				delete s.counts[id];
				delete s.pointers[id];
				delete s.data[id];
				return null;
			}
			s.pointers[id] = 0;
		}
		const d = s.data[id][s.pointers[id]];
		++s.pointers[id];
		return d;
	},
	send_failure: function (resp, reason, code) {
		if (typeof code === 'undefined') {
			code = 418;
		}
		resp.writeHead(code, reason);
		resp.end();
	},
	send_success: function (resp, message) {
		resp.writeHead(202, { 'Content-Type': 'text/plain' });
		resp.end(message);
	},
	send_json: function (resp, data) {
		resp.setHeader('Content-Type', 'application/json');
		resp.end(JSON.stringify(data));
	}
};
s.init();
