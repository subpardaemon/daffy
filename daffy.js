// "I'm so crazy I don't know this isn't possible." - DD

const http = require("http");
const csvparse = require('csv-parse/lib/sync');
const fs = require("fs");

const port = parseInt(process.env.DAFFY_PORT || 8033);
if (!port) port = 8033;
if (process.env.DAFFY_PORT) {
  console.log("Listen port overridden to " + process.env.DAFFY_PORT);
}
const indexPage = fs.readFileSync('./index.html', { encoding: 'utf8' });

const s = {
  data: {},
	pointers: {},
	counts: {},
	http: null,
	init: function () {
		s.http = http.createServer();
		s.http.listen(port, undefined);
		s.http.on('error', function (err) {
			console.error(err);
		}.bind(this));
		s.http.on('request', function (req, resp) {
      console.log(req.method + ' ' + req.url);
      // s.http.getConnections((e,c)=> {
      //   if (!e) console.log('connections: ' + c.toString());
      // });
      const parts = req.url.substr(1).split('/');
			if (req.method === 'GET') {
        if (req.url === '/' || req.url === '/index.html') {
          s.send_raw(resp, indexPage);
        }
        else if (parts[0] === 'ping') {
          s.send_json(resp, "pong");
        }
				else if (parts[0] === 'list') {
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
					s.send_failure(resp, "Unknown command", 400);
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
							}, 201);
						}
						catch (e) {
							s.send_failure(resp, "Incorrect request (parse failed)", 400);
							console.error('Parse error:', e);
						}
					}).on('error', function () {
						s.send_failure(resp, "Incorrect request", 400);
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
	send_raw: function (resp, data, contentType, code) {
		if (typeof code === 'undefined') {
			code = 200;
    }
    if (typeof contentType === 'undefined') {
      contentType = 'text/html; charset=UTF-8';
    }
		resp.writeHead(code, { 'Content-Type': contentType });
		resp.end(data);
	},
	send_json: function (resp, data, code) {
		if (typeof code === 'undefined') {
			code = 200;
		}
		resp.writeHead(code, { 'Content-Type': 'application/json' });
		resp.end(JSON.stringify(data));
	}
};
s.init();
