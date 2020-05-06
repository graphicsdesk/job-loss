# SLUG

This story was created with [Spectate](https://github.com/graphicsdesk/spectate). For setup and usage instructions, see the [Spectate documentation](https://github.com/graphicsdesk/spectate/#cloning-a-spectate-project).

## Data Diary

### `postings.json`

To retrieve postings data from MongoDB, use the `process/get-data.js` script. It requires a `.env` file with the following [credentials](https://docs.google.com/document/d/1C6WPRpabD6YXjQK3VnvjGy02fgxaARHbJTirm3Rzf8I/edit#heading=h.tamwx7fxlakd):
```
MONGO_USERNAME = <username>
MONGO_PASSWORD = <password>
```

Once that's setup, you should be able to run:
```
$ node process/get-data.js.
```

The script writes the file `data/postings.json`, a list of postings from September to May. The structure of the file looks like this:
```js
[
  {
    "date": string,  // format: YYYY-MM-DD
    "count": number,
  },
  ...
]
```

### `employer-industries.json`

This is the output from the `canceled-internships` repository.
