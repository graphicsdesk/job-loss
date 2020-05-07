# SLUG

This story was created with [Spectate](https://github.com/graphicsdesk/spectate). For setup and usage instructions, see the [Spectate documentation](https://github.com/graphicsdesk/spectate/#cloning-a-spectate-project).

## Data Diary

### `data/canceled-internships.json`

This is the output from the [`generate_outputs.store_canceled_internships_data()` function](https://github.com/graphicsdesk/canceled-internships#job-loss-intermediate-output) in the `canceled-internships` repository.

### `data/postings.json`

To get postings data from MongoDB, use the `process/get-data.js` script. It requires a `.env` file with the following [credentials](https://docs.google.com/document/d/1C6WPRpabD6YXjQK3VnvjGy02fgxaARHbJTirm3Rzf8I/edit#heading=h.tamwx7fxlakd):

```
MONGO_USERNAME = <username>
MONGO_PASSWORD = <password>
```

Once that's setup, you can run:

```
$ node process/get-data.js
```

The script writes the file `data/postings.json`, a list of postings from September to the current date aggregated by date and flattened into an array. The structure of the file looks like this:

```js
[
  {
    "date": string,  // format: YYYY-MM-DD
    "count": number,
  },
  ...
]
```
