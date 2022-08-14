const states = {
    startField: 'startField',
    startRow: 'startRow',
    escaped: 'escaped',
    nonQuoted: 'nonQuoted',
    quoted: 'quoted',
};
const EOF = 'eof';

function* parse(content) {
    let row = [];
    let state = states.startRow;
    let fieldBuffer = [];

    const startRow = () => {
        row = [];
    };
    const endField = () => {
        row.push(fieldBuffer.join(''));
        fieldBuffer = [];
    };
    const machineError = () => new Error('Invalid end of state');

    const machine = {
        [states.startRow](char) {
            startRow();

            if (/\n/.test(char)) {
                return states.startRow;
            } else if (char === EOF) {
                // no op
            } else if (/,/.test(char)) {
                endField();

                return states.startField;
            } else if (/"/.test(char)) {
                return states.quoted;
            } else if (char) {
                fieldBuffer.push(char);

                return states.nonQuoted;
            }
        },
        [states.startField](char) {
            if (char === EOF) {
                // no op
            } else if (/,/.test(char)) {
                endField();

                return states.startField;
            } else if (/"/.test(char)) {
                return states.quoted;
            } else if (/[\n\r]/.test(char)) {
                endField();

                return states.startRow;
            } else if (char) {
                fieldBuffer.push(char);

                return states.nonQuoted;
            } else {
                throw machineError();
            }
        },
        [states.escaped](char) {
            if (char === EOF) {
                endField();
            } else if (/"/.test(char)) {
                fieldBuffer.push(char);

                return states.quoted;
            } else if (/,/.test(char)) {
                endField();

                return states.startField;
            } else if (/[\n\r]/.test(char)) {
                endField();

                return states.startRow;
            } else {
                throw machineError();
            }
        },
        [states.quoted](char) {
            if (/"/.test(char)) {
                return states.escaped;
            } else if (char !== EOF) {
                fieldBuffer.push(char);

                return states.quoted;
            } else {
                throw machineError();
            }
        },
        [states.nonQuoted](char) {
            if (char === EOF) {
                endField();
            } else if (/,/.test(char)) {
                endField();

                return states.startField;
            } else if (/[\n\r]/.test(char)) {
                endField();

                return states.startRow;
            } else if (char) {
                fieldBuffer.push(char);

                return states.nonQuoted;
            } else {
                throw machineError();
            }
        },
    };

    for (const char of content) {
        state = machine[state](char);

        if (state === states.startRow && row.length) {
            yield row;
        }
    }

    machine[state](EOF);

    if (row.length) {
        yield row;
    }
}

module.exports.csvParser = (content) => {
    const parser = parse(content);
    const data = [];

    for (const row of parser) {
        data.push(row);
    }

    return data;
};
