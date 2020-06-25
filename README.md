# DAta Feeder For You = DAFFY

## Whatisit

DAFFY is a simple data line feeder. It is designed to accept data sets as uploads (either in CSV or JSON format),
then serve individual rows up with each GET /next request.

The primary intended use is in large-factor functional stress testing. By using DAFFY, you just feed your generated
data set into the server, then your load-testing agents (which may even be distributed) will get a new data row by
each subsequent GET /next calls - that is, until the data set runs out.

You can have as many separate data sets in DAFFY as you wish, but bear in mind that DAFFY keeps everything in memory.

## Usage

Whenever a dataset ID is used, it must match this regex: `/^[a-zA-Z0-9_:,-]+$/`.

### `GET /<id>/next` or `GET /<id>/next/<number>`

Get the next row or the next `<number>` rows in dataset `<id>`. If you don't specify a number, you get the data row
as a JSON-encoded object; if you specify a number (even if it is 1) you receive the data rows as a JSON-encoded array.

### `GET /list`

Get information about current datasets (id, count, repeat and current index). The info is sent in JSON format.

### `POST /<id>` or `POST /<id>/<repeats>` or `PUT /<id>`

Upload a dataset under ID `<id>`. If `<repeats>` is specified, it means the dataset can be fetched `<repeats>` times
instead of the default, which is each element can be fetched only once. If the request is sent as `PUT`, it appends
the new rows instead of replacing the dataset.

By default, it expects data to be in JSON. If you want to upload CSV, make sure you set the Content-type header to
`text/csv`. Otherwise, just use `application/json`.

_WARNING_: both POST and PUT operations happen synchronously, so make sure you're not fetching data from DAFFY while
uploading a new dataset.

If the upload was a success, it retuns a small JSON object with statistics data.

## Roadmap

- Maybe an XML input/output vartiant would be nice. Maybe. Does anyone still use XML out there? Hello?
- Maybe an asynchronous upload?
