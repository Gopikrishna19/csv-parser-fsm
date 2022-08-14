const states = {
    startField: Symbol('startField'),
    startRow: Symbol('startRow'),
    escaped: Symbol('escaped'),
    nonQuoted: Symbol('nonQuoted'),
    quoted: Symbol('quoted'),
};
const EOF = 'eof';

const machineError = () => new Error('Invalid end of state');

class Machine {
    #content;
    #row = [];
    #state = states.startRow;
    #fieldBuffer = [];

    constructor(content) {
        this.#content = content;
    }

    * getReader() {
        for (const char of this.#content) {
            this.#state = this[this.#state](char);

            if (this.#state === states.startRow && this.#row.length) {
                yield this.#row;
            }
        }

        this[this.#state](EOF);

        if (this.#row.length) {
            yield this.#row;
        }
    }

    #startRow() {
        this.#row = [];
    }

    #endField() {
        this.#row.push(this.#fieldBuffer.join(''));
        this.#fieldBuffer = [];
    }

    [states.startRow](char) {
        this.#startRow();

        if (/\n/.test(char)) {
            return states.startRow;
        } else if (char === EOF) {
            // no op
        } else if (/,/.test(char)) {
            this.#endField();

            return states.startField;
        } else if (/"/.test(char)) {
            return states.quoted;
        } else if (char) {
            this.#fieldBuffer.push(char);

            return states.nonQuoted;
        }
    }

    [states.startField](char) {
        if (char === EOF) {
            // no op
        } else if (/,/.test(char)) {
            this.#endField();

            return states.startField;
        } else if (/"/.test(char)) {
            return states.quoted;
        } else if (/[\n\r]/.test(char)) {
            this.#endField();

            return states.startRow;
        } else if (char) {
            this.#fieldBuffer.push(char);

            return states.nonQuoted;
        } else {
            throw machineError();
        }
    }

    [states.escaped](char) {
        if (char === EOF) {
            this.#endField();
        } else if (/"/.test(char)) {
            this.#fieldBuffer.push(char);

            return states.quoted;
        } else if (/,/.test(char)) {
            this.#endField();

            return states.startField;
        } else if (/[\n\r]/.test(char)) {
            this.#endField();

            return states.startRow;
        } else {
            throw machineError();
        }
    }

    [states.quoted](char) {
        if (/"/.test(char)) {
            return states.escaped;
        } else if (char !== EOF) {
            this.#fieldBuffer.push(char);

            return states.quoted;
        } else {
            throw machineError();
        }
    }

    [states.nonQuoted](char) {
        if (char === EOF) {
            this.#endField();
        } else if (/,/.test(char)) {
            this.#endField();

            return states.startField;
        } else if (/[\n\r]/.test(char)) {
            this.#endField();

            return states.startRow;
        } else if (char) {
            this.#fieldBuffer.push(char);

            return states.nonQuoted;
        } else {
            throw machineError();
        }
    }
}

module.exports.csvParser = (content) => {
    const reader = new Machine(content).getReader();
    const data = [];

    for (const row of reader) {
        data.push(row);
    }

    return data;
};
