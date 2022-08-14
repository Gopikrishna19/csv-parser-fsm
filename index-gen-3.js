class State {
    #inputMatches = [];
    #expectNextState;

    static ANY = Symbol('any match');
    static EOF = Symbol('end of input');

    static #match(match, char) {
        if (match === State.ANY) {
            return Boolean(char);
        } else if (match === State.EOF || typeof char === 'symbol') {
            return match === char;
        } else {
            return new RegExp(match).test(char);
        }
    }

    map(match, nextState, ...actions) {
        this.#inputMatches.push({
            actions,
            match,
            nextState,
        });

        return this;
    }

    expectNext() {
        this.#expectNextState = true;

        return this;
    }

    apply(char) {
        let state;

        for (const {match, actions, nextState} of this.#inputMatches) {
            if (State.#match(match, char)) {
                actions.forEach((action) => action(char));
                state = nextState;

                break;
            }
        }

        if (this.#expectNextState && !state) {
            throw new Error(`Unreachable state after ${char}. Input unexpectedly ended`);
        }

        return state;
    }
}

const buildCsvFiniteStateMachine = (onRow) => {
    let row = [];
    let field = [];

    const startRow = new State();
    const startField = new State();
    const escaped = new State();
    const nonQuoted = new State();
    const quoted = new State();
    const end = new State();

    const startNewRow = () => {
        if (row.length) {
            onRow(row);
            row = [];
        }
    };
    const endField = () => {
        row.push(field.join(''));
        field = [];
    };
    const buildField = (char) => {
        field.push(char);
    };

    startRow
        .map(State.EOF, end, startNewRow)
        .map('\n', startRow, startNewRow)
        .map(',', startField, startNewRow, endField)
        .map('"', quoted, startNewRow)
        .map(State.ANY, nonQuoted, startNewRow, buildField);

    startField
        .map(State.EOF, end)
        .map('[\r\n]', startRow, endField)
        .map(',', startField, endField)
        .map('"', quoted)
        .map(State.ANY, nonQuoted, buildField)
        .expectNext();

    escaped
        .map(State.EOF, end, endField, startNewRow)
        .map('[\r\n]', startRow, endField)
        .map(',', startField, endField)
        .map('"', quoted, buildField)
        .expectNext();

    quoted
        .map(State.EOF)
        .map('"', escaped)
        .map(State.ANY, quoted, buildField)
        .expectNext();

    nonQuoted
        .map(State.EOF, end, endField, startNewRow)
        .map('[\r\n]', startRow, endField)
        .map(',', startField, endField)
        .map(State.ANY, nonQuoted, buildField)
        .expectNext();

    return startRow;
};

function* getReader(content) {
    const chars = [...content, State.EOF];
    let row = [];
    let current = buildCsvFiniteStateMachine((newRow) => row = newRow);

    for (const char of chars) {
        current = current.apply(char);

        if (row.length) {
            yield row;
            row = [];
        }
    }
}

module.exports.csvParser = (content) => {
    const reader = getReader(content);
    const data = [];

    for (const row of reader) {
        data.push(row);
    }

    return data;
};
