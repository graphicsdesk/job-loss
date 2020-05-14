# Job Loss

This story was created with [Spectate](https://github.com/graphicsdesk/spectate). For setup and usage instructions, see the [Spectate documentation](https://github.com/graphicsdesk/spectate/#cloning-a-spectate-project).

This repository does not include the postings data so it can stay public. Postings data can be re-generated locally by following the [Data Diary](#datapostingsjson).

## Data Diary

#### `data/postings.json`

To get postings data from MongoDB, setup a `.env` file with the following [credentials](https://docs.google.com/document/d/1C6WPRpabD6YXjQK3VnvjGy02fgxaARHbJTirm3Rzf8I/edit#heading=h.tamwx7fxlakd):

```
MDB_USERNAME = <username>
MDB_PASSWORD = <password>
```

Now you can run:

```
$ node process/get-data.js
```

#### `data/canceled-internships.json`

Here's a [one-liner](https://github.com/graphicsdesk/canceled-internships#shortcuts) for generating the data using the [`canceled-internships`](https://github.com/graphicsdesk/canceled-internships) repository.
