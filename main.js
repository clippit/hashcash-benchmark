(function(Benchmark) {
    var $ = document.querySelector.bind(document);
    var suite;

    function init() {
        $('#platform').innerHTML = Benchmark.platform;

        var btncount = $('#btncount');
        var count = 0;
        $('#btn').addEventListener('click', function(e) {
            e.preventDefault();
            count++;
            btncount.innerHTML = count;
        });

        if (!!window.Worker) {
            $('#ww').innerHTML = 'Yes';
            $('#use-worker').checked = true;
        } else {
            $('#ww').innerHTML = 'Yes';
            $('#use-worker').checked = false;
            $('#use-worker').disabled = true;
        }

        $('#start').addEventListener('click', function(e) {
            e.preventDefault();
            startTestSuite(8, 20, 4, $('#use-worker').checked);
        });
    }


    function startTestSuite(kmin, kmax, step, useWorker) {
        suite = new Benchmark.Suite('hashcash');
        $('#stat').textContent = '';
        $('#result').textContent = '';

        for (var i = kmin; i <= kmax; i += step || 1) {
            suite.add({
                'name': 'k=' + i,
                'async': true,
                'defer': true,
                'minSamples': 32,
                'onStart': function() {
                    this._useWorker = useWorker;
                    if (this._useWorker) {
                        this._worker = new Worker('worker.js');
                        this._getStamp = this._worker.postMessage.bind(this._worker);
                    } else {
                        this._rusha = new Rusha(4 * 1024 * 1024);
                        this._getStampInner = function(callback, str) {
                            var k = parseInt(str.split(':')[1], 10) | 0;
                            var counter = 0;
                            var test = str + counter.toString(36);

                            while(!this._leading0s(k, this._rusha.digest(test))) {
                                counter++;
                                test = str + counter.toString(36);
                            }

                            setTimeout(function() {
                                callback({"data": test});
                            }, 0);
                        };
                        this._leading0s = function(k, str) {
                            var i = 0;
                            while (k - 4 >= 0) {
                                if (str.charAt(i) != '0') {
                                    return false;
                                }
                                k -= 4;
                                i += 1;
                            }
                            var last = parseInt(str.charAt(i), 16);
                            if ((k == 0) ||
                                (k == 1 && last <= 7) ||
                                (k == 2 && last <= 3) ||
                                (k == 3 && last <= 1)) {
                                return true;
                            } else {
                                return false;
                            }
                        };
                    }

                    this._results = {};
                },
                'setup': function() {
                    var k = this.benchmark.name.slice(2);
                    var deferred = this;
                    var resolver = function(e) {
                        if (this._original._results[e.data]) {
                                this._original._results[e.data] += 1;
                        } else {
                            this._original._results[e.data] = 1;
                        }
                        deferred.resolve();
                    };

                    if (this.benchmark._useWorker) {
                        this.benchmark._worker.onmessage = resolver.bind(this.benchmark);
                    } else {
                        this.benchmark._getStamp = function(prefix) {
                            setTimeout(this._getStampInner.bind(this, resolver.bind(this), prefix), 0);
                        }
                    }

                    this._prefix = [
                        '1',
                        k,
                        Date.now() / 1000 | 0,
                        'foo@bar.net',
                        Math.random().toString(36).substring(7),
                        ''
                    ].join(':');

                    document.querySelector("#stat").textContent = 'Current prefix: ' + this._prefix;
                },
                'fn': function() {
                    this.benchmark._getStamp(this._prefix);
                },
                'teardown': function() {
                    if (this.benchmark._useWorker) {
                        this.benchmark._worker.onmessage = undefined;
                    }
                },
                'onComplete': function() {
                    if (this._useWorker) {
                        this._worker.terminate();
                        this._worker = null;
                    } else {
                        this._rusha = null;
                    }
                }
            });
        }

        suite.on('cycle', function(event) {
            var benchmark = event.target;
            showResult(benchmark);
        });

        suite.on('complete', function() {
            $('#stat').textContent = 'All done! See below:';
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
        var sum = 0;
        for (var stamp in benchmark._results) {
            if (benchmark._results.hasOwnProperty(stamp)) {
                append.push('   * ' + stamp + ' (' + benchmark._results[stamp] + ' cycles)');
                sum += parseInt(stamp.split(':')[5], 36);
            }
        }
        append.push((sum / stamp.length) + ' tries on average to get one stamp')
        append.push("\n");
        result.textContent += append.join("\n");
    }


    init();
})(Benchmark);

