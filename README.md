# Job Loss

This story was created with [Spectate](https://github.com/graphicsdesk/spectate). For setup and usage instructions, see the [Spectate documentation](https://github.com/graphicsdesk/spectate/#cloning-a-spectate-project).

This repository does not include its data sources so it can stay public. Data can be re-generated locally by following the [Data Diary](#data-diary).

## Data Diary

#### `data/canceled-internships.json`

This is the output from the `generate_outputs.store_canceled_internships_data()` function in the [`canceled-internships`](https://github.com/graphicsdesk/canceled-internships) repository. Look at [its documentation](https://github.com/graphicsdesk/canceled-internships#job-loss-intermediate-output) for more information.

#### `data/postings.json`

To get postings data from MongoDB, use the `process/get-data.js` script. It requires a `.env` file with the following [credentials](https://docs.google.com/document/d/1C6WPRpabD6YXjQK3VnvjGy02fgxaARHbJTirm3Rzf8I/edit#heading=h.tamwx7fxlakd):

```
MDB_USERNAME = <username>
MDB_PASSWORD = <password>
```

Once that's setup, you can run:

```
$ node process/get-data.js
```

The script writes the file `data/postings.json`, a list of postings from September to the current date aggregated by date and flattened into an array. Also stores percent changes for each industry. The structure of the file looks like this:

```js
{
  postings: [
    {
      date: string,  // format: YYYY-MM-DD
      count: number,
      remoteCount: number,
    },
    ...
  ],
  industryChanges: {
    INDUSTRY NAME: PERCENT CHANGE,
    ...
  }
}
```
