(function(Benchmark) {
    var $ = document.querySelector.bind(document);
    var suite;

    function init() {
        $('#platform').innerHTML = Benchmark.platform;
        $('#ww').innerHTML = window.Worker ? 'Yes' : 'No';

        var btncount = $('#btncount');
        var count = 0;
        $('#btn').addEventListener('click', function(e) {
            e.preventDefault();
            count++;
            btncount.innerHTML = count;
        })

        $('#start').addEventListener('click', function(e) {
            e.preventDefault();
            startTestSuite(8, 12, 4);
        });
    }


    function startTestSuite(kmin, kmax, step) {
        suite = new Benchmark.Suite('hashcash');

        for (var i = kmin; i <= kmax; i += step || 1) {
            suite.add({
                'name': 'k=' + i,
                'async': true,
                'defer': true,
                'minSamples': 32,
                'onStart': function() {
                    this._worker = new Worker('worker.js');
                    this._results = {};
                    // reduce execution time
                    if (this.count > 16) {
                        this.count = 16;
                    }
                },
                'setup': function() {
                    var k = this.benchmark.name.slice(2);
                    var deferred = this;

                    this.benchmark._worker.onmessage = (function(e) {
                        if (this._original._results[e.data]) {
                            this._original._results[e.data] += 1;
                        } else {
                            this._original._results[e.data] = 1;
                        }
                        deferred.resolve();
                    }).bind(this.benchmark);

                    this._prefix = [
                        '1',
                        k,
                        Date.now() / 1000 | 0,
                        'foo@bar.net',
                        Math.random().toString(36).substring(7),
                        ''
                    ].join(':');

                    document.querySelector("#stat").innerText = 'Current prefix: ' + this._prefix;
                },
                'fn': function() {
                    this.benchmark._worker.postMessage(this._prefix);
                },
                'teardown': function() {
                    this.benchmark._worker.onmessage = undefined;
                },
                'onComplete': function() {
                    this._worker.terminate();
                    this._worker = null;
                }
            });
        }

        suite.on('cycle', function(event) {
            var benchmark = event.target;
            showResult(benchmark);
        });

        suite.on('complete', function() {
            $('#stat').innerText = 'All done! See below:';
        });

        suite.run({'async': true});
    }

    function showResult(benchmark) {
        var result = $('#result');
        var append = [
            benchmark.toString(),
            '(' + 1 / benchmark.hz + ' secs to get one stamp)',
            'stamps:'
        ];
        for (var stamp in benchmark._results) {
            if (benchmark._results.hasOwnProperty(stamp)) {
                append.push('   * ' + stamp + ' (' + benchmark._results[stamp] + ' cycles)');
            }
        }
        append.push("\n");
        result.innerText += append.join("\n");
    }


    init();
})(Benchmark);

