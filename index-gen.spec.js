const {csvParser} = require('./index-gen');

describe('parser gen', () => {
    it('should handle no content', () => {
        expect(csvParser('')).toEqual([]);
    });

    it('should handle one word', () => {
        expect(csvParser('hello')).toEqual([['hello']]);
        expect(csvParser('"hello"')).toEqual([['hello']]);
    });

    it('should handle two words', () => {
        expect(csvParser('hello,world')).toEqual([['hello', 'world']]);
        expect(csvParser('hello,"world"')).toEqual([['hello', 'world']]);
    });

    it('should handle escaped words', () => {
        expect(csvParser('hello,world""')).toEqual([['hello', 'world""']]);
        expect(csvParser('hello,"""world"""')).toEqual([['hello', '"world"']]);
    });

    it('should handle empty words', () => {
        expect(csvParser('hello,,world')).toEqual([['hello', '', 'world']]);
        expect(csvParser('"hello",,world')).toEqual([['hello', '', 'world']]);
        expect(csvParser(',world')).toEqual([['', 'world']]);
        expect(csvParser(',\n')).toEqual([['', '']]);
        expect(csvParser(',\r')).toEqual([['', '']]);
        expect(csvParser(',\r\n')).toEqual([['', '']]);
    });

    it('should handle lf', () => {
        expect(csvParser('hello\n"hello"')).toEqual([['hello'], ['hello']]);
        expect(csvParser('hello,world\nhello,world')).toEqual([['hello', 'world'], ['hello', 'world']]);
        expect(csvParser('hello,,world\n"hello",,world')).toEqual([['hello', '', 'world'], ['hello', '', 'world']]);
    });

    it('should handle cr', () => {
        expect(csvParser('hello\r"hello"')).toEqual([['hello'], ['hello']]);
        expect(csvParser('hello,world\rhello,world')).toEqual([['hello', 'world'], ['hello', 'world']]);
        expect(csvParser('hello,,world\r"hello",,world')).toEqual([['hello', '', 'world'], ['hello', '', 'world']]);
    });

    it('should handle crlf', () => {
        expect(csvParser('hello\r\n"hello"')).toEqual([['hello'], ['hello']]);
        expect(csvParser('hello,world\r\nhello,world')).toEqual([['hello', 'world'], ['hello', 'world']]);
        expect(csvParser('hello,,world\r\n"hello",,world')).toEqual([['hello', '', 'world'], ['hello', '', 'world']]);
    });

    it('should handle all', () => {
        const sampleRows = (lineBreak) => [
            'hello,world,"this,is,good"',
            'this,has,numbers,1234',
            'this,has,special,characters,!@#$%^&*()\'[]{}./\\|-=_+<>?',
            'hello,world,"this,is,escaped""quotation"""',
            'this,,has,,spaces',
            'this has spaces',
            `and,"trailing,spaces",with,eol,${lineBreak}`,
        ].join(lineBreak);

        const lfRows = sampleRows('\n');
        const crRows = sampleRows('\r');
        const crlfRows = sampleRows('\r\n');

        const expected = [
            ['hello', 'world', 'this,is,good'],
            ['this', 'has', 'numbers', '1234'],
            ['this', 'has', 'special', 'characters', '!@#$%^&*()\'[]{}./\\|-=_+<>?'],
            ['hello', 'world', 'this,is,escaped"quotation"'],
            ['this', '', 'has', '', 'spaces'],
            ['this has spaces'],
            ['and', 'trailing,spaces', 'with', 'eol', ''],
        ];

        expect(csvParser(lfRows)).toEqual(expected);
        expect(csvParser(crRows)).toEqual(expected);
        expect(csvParser(crlfRows)).toEqual(expected);
    });
});
