var unescape = require('../../lib/unescape');

describe('unescape', function() {
  it('should unescape colons', function() {
    var toBeUnescaped = {
      Users: [{
        foo: 'http:://google.com',
        bar: 'buz::baz::bee'
      }]
    };

    var unescaped = unescape(toBeUnescaped);
    expect(unescaped).to.eql({
      Users: [{
        foo: 'http://google.com',
        bar: 'buz:baz:bee'
      }]
    });
  });
});
