## An app to learn kanji!

You can see the published version [here](https://mykanji.vercel.app)

## Build steps

1. Clone the repo
1. `npm i`
1. `npm run dev`

1. Go to `localhost:3000`

> [!CAUTION]
> You need to add a `.env` file with `DATABASE_URL` linking to a (local or production) PostgreSQL database!

## Features:

### Kanji tracking list

###### A list of kanjis where you can track your progress

- [x] Custom kanji adding
- [x] Kanji lvls
- [x] Kanji filtering
- [x] Opt-in kanji updates
- [x] Online backup with custom save ID
- [ ] List sharing with friends w/o the use of the database (partially, overrides local list)

##### TODO

- [ ] Add tags for custom filterings
- [ ] Add the official [Joyou kanji list](https://www.bunka.go.jp/kokugo_nihongo/sisaku/joho/joho/kijun/naikaku/pdf/joyokanjihyo_20101130.pdf)
- [ ] Add "preview" mode so that sharing lists doesn't destroy the local list

### Wordbank

###### A list of words being used by other parts of the app

- [x] A working wordbank with meanings and per-kanji meanings
- [x] Ease of adding new words!
- [x] Opt-in updating the wordbank to newest server version (w/o overrides)

##### TODO

- [ ] Add the words from Jotou kanji list
- [ ] Add ability to share wordbanks

#### Draw (more like FlashCards for now)

###### A place to learn how to draw kanjis. Take out a piece of paper, select what kanjis you want to learn and hop in to the session to learn how to draw them!

- [x] Anki-like flashcard system for scoring
- [x] Showing stroke order after every word, to show you how it should be done correctly

###### Stroke order display using: [Kanji Stroke Order Font](https://www.nihilist.org.uk/)

##### TODO

- [ ] Ability to change kanji status after an amount of points for given kanji is reached
- [ ] Switch to a better selection algorightm (spaced repetition, etc.)
- [ ] Actually make users draw the kanjis in-app
