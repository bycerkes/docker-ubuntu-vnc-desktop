// requires local modules: util, base64, display
// requires test modules: assertions
/* jshint expr: true */
var expect = chai.expect;

describe('Display/Canvas Helper', function () {
    var checked_data = [
        0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255, 0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255,
        0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255, 0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255,
        0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255, 0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255,
        0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255, 0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255
    ];
    checked_data = new Uint8Array(checked_data);

    var basic_data = [0xff, 0x00, 0x00, 255, 0x00, 0xff, 0x00, 255, 0x00, 0x00, 0xff, 255, 0xff, 0xff, 0xff, 255];
    basic_data = new Uint8Array(basic_data);

    function make_image_canvas (input_data) {
        var canvas = document.createElement('canvas');
        canvas.width = 4;
        canvas.height = 4;
        var ctx = canvas.getContext('2d');
        var data = ctx.createImageData(4, 4);
        for (var i = 0; i < checked_data.length; i++) { data.data[i] = input_data[i]; }
        ctx.putImageData(data, 0, 0);
        return canvas;
    }

    function make_image_png (input_data) {
        var canvas = make_image_canvas(input_data);
        var url = canvas.toDataURL();
        var data = url.split(",")[1];
        return Base64.decode(data);
    }

    describe('checking for cursor uri support', function () {
        beforeEach(function () {
            this._old_browser_supports_cursor_uris = Util.browserSupportsCursorURIs;
        });

        it('should disable cursor URIs if there is no support', function () {
            Util.browserSupportsCursorURIs = function () { return false; };
            var display = new Display({ target: document.createElement('canvas'), prefer_js: true, viewport: false });
            expect(display._cursor_uri).to.be.false;
        });

        it('should enable cursor URIs if there is support', function () {
            Util.browserSupportsCursorURIs = function () { return true; };
            var display = new Display({ target: document.createElement('canvas'), prefer_js: true, viewport: false });
            expect(display._cursor_uri).to.be.true;
        });

        it('respect the cursor_uri option if there is support', function () {
            Util.browserSupportsCursorURIs = function () { return false; };
            var display = new Display({ target: document.createElement('canvas'), prefer_js: true, viewport: false, cursor_uri: false });
            expect(display._cursor_uri).to.be.false;
        });

        afterEach(function () {
            Util.browserSupportsCursorURIs = this._old_browser_supports_cursor_uris;
        });
    });

    describe('viewport handling', function () {
        var display;
        beforeEach(function () {
            display = new Display({ target: document.createElement('canvas'), prefer_js: false, viewport: true });
            display.resize(5, 5);
            display.viewportChangeSize(3, 3);
            display.viewportChangePos(1, 1);
        });

        it('should take viewport location into consideration when drawing images', function () {
            display.resize(4, 4);
            display.viewportChangeSize(2, 2);
            display.drawImage(make_image_canvas(basic_data), 1, 1);
            display.flip();

            var expected = new Uint8Array(16);
            var i;
            for (i = 0; i < 8; i++) { expected[i] = basic_data[i]; }
            for (i = 8; i < 16; i++) { expected[i] = 0; }
            expect(display).to.have.displayed(expected);
        });

        it('should resize the target canvas when resizing the viewport', function() {
            display.viewportChangeSize(2, 2);
            expect(display._target.width).to.equal(2);
            expect(display._target.height).to.equal(2);
        });

        it('should move the viewport if necessary', function() {
            display.viewportChangeSize(5, 5);
            expect(display.absX(0)).to.equal(0);
            expect(display.absY(0)).to.equal(0);
            expect(display._target.width).to.equal(5);
            expect(display._target.height).to.equal(5);
        });

        it('should limit the viewport to the framebuffer size', function() {
            display.viewportChangeSize(6, 6);
            expect(display._target.width).to.equal(5);
            expect(display._target.height).to.equal(5);
        });

        it('should redraw when moving the viewport', function () {
            display.flip = sinon.spy();
            display.viewportChangePos(-1, 1);
            expect(display.flip).to.have.been.calledOnce;
        });

        it('should redraw when resizing the viewport', function () {
            display.flip = sinon.spy();
            display.viewportChangeSize(2, 2);
            expect(display.flip).to.have.been.calledOnce;
        });

        it('should report clipping when framebuffer > viewport', function () {
            var clipping = display.clippingDisplay();
            expect(clipping).to.be.true;
        });

        it('should report not clipping when framebuffer = viewport', function () {
            display.viewportChangeSize(5, 5);
            var clipping = display.clippingDisplay();
            expect(clipping).to.be.false;
        });

        it('should show the entire framebuffer when disabling the viewport', function() {
            display.set_viewport(false);
            expect(display.absX(0)).to.equal(0);
            expect(display.absY(0)).to.equal(0);
            expect(display._target.width).to.equal(5);
            expect(display._target.height).to.equal(5);
        });

        it('should ignore viewport changes when the viewport is disabled', function() {
            display.set_viewport(false);
            display.viewportChangeSize(2, 2);
            display.viewportChangePos(1, 1);
            expect(display.absX(0)).to.equal(0);
            expect(display.absY(0)).to.equal(0);
            expect(display._target.width).to.equal(5);
            expect(display._target.height).to.equal(5);
        });

        it('should show the entire framebuffer just after enabling the viewport', function() {
            display.set_viewport(false);
            display.set_viewport(true);
            expect(display.absX(0)).to.equal(0);
            expect(display.absY(0)).to.equal(0);
            expect(display._target.width).to.equal(5);
            expect(display._target.height).to.equal(5);
        });
    });

    describe('resizing', function () {
        var display;
        beforeEach(function () {
            display = new Display({ target: document.createElement('canvas'), prefer_js: false, viewport: false });
            display.resize(4, 4);
        });

        it('should change the size of the logical canvas', function () {
            display.resize(5, 7);
            expect(display._fb_width).to.equal(5);
            expect(display._fb_height).to.equal(7);
        });

        it('should keep the framebuffer data', function () {
            display.fillRect(0, 0, 4, 4, [0, 0, 0xff]);
            display.resize(2, 2);
            display.flip();
            var expected = [];
            for (var i = 0; i < 4 * 2*2; i += 4) {
                expected[i] = 0xff;
                expected[i+1] = expected[i+2] = 0;
                expected[i+3] = 0xff;
            }
            expect(display).to.have.displayed(new Uint8Array(expected));
        });

        describe('viewport', function () {
            beforeEach(function () {
                display.set_viewport(true);
                display.viewportChangeSize(3, 3);
                display.viewportChangePos(1, 1);
            });

            it('should keep the viewport position and size if possible', function () {
                display.resize(6, 6);
                expect(display.absX(0)).to.equal(1);
                expect(display.absY(0)).to.equal(1);
                expect(display._target.width).to.equal(3);
                expect(display._target.height).to.equal(3);
            });

            it('should move the viewport if necessary', function () {
                display.resize(3, 3);
                expect(display.absX(0)).to.equal(0);
                expect(display.absY(0)).to.equal(0);
                expect(display._target.width).to.equal(3);
                expect(display._target.height).to.equal(3);
            });

            it('should shrink the viewport if necessary', function () {
                display.resize(2, 2);
                expect(display.absX(0)).to.equal(0);
                expect(display.absY(0)).to.equal(0);
                expect(display._target.width).to.equal(2);
                expect(display._target.height).to.equal(2);
            });
        });
    });

    describe('rescaling', function () {
        var display;
        var canvas;

        beforeEach(function () {
            display = new Display({ target: document.createElement('canvas'), prefer_js: false, viewport: true });
            display.resize(4, 4);
            display.viewportChangeSize(3, 3);
            display.viewportChangePos(1, 1);
            canvas = display.get_target();
            document.body.appendChild(canvas);
        });

        afterEach(function () {
            document.body.removeChild(canvas);
        });

        it('should not change the bitmap size of the canvas', function () {
            display.set_scale(2.0);
            expect(canvas.width).to.equal(3);
            expect(canvas.height).to.equal(3);
        });

        it('should change the effective rendered size of the canvas', function () {
            display.set_scale(2.0);
            expect(canvas.clientWidth).to.equal(6);
            expect(canvas.clientHeight).to.equal(6);
        });

        it('should not change when resizing', function () {
            display.set_scale(2.0);
            display.resize(5, 5);
            expect(display.get_scale()).to.equal(2.0);
            expect(canvas.width).to.equal(3);
            expect(canvas.height).to.equal(3);
            expect(canvas.clientWidth).to.equal(6);
            expect(canvas.clientHeight).to.equal(6);
        });
    });

    describe('autoscaling', function () {
        var display;
        var canvas;

        beforeEach(function () {
            display = new Display({ target: document.createElement('canvas'), prefer_js: false, viewport: true });
            display.resize(4, 3);
            canvas = display.get_target();
            document.body.appendChild(canvas);
        });

        afterEach(function () {
            document.body.removeChild(canvas);
        });

        it('should preserve aspect ratio while autoscaling', function () {
            display.autoscale(16, 9);
            expect(canvas.clientWidth / canvas.clientHeight).to.equal(4 / 3);
        });

        it('should use width to determine scale when the current aspect ratio is wider than the target', function () {
            display.autoscale(9, 16);
            expect(display.absX(9)).to.equal(4);
            expect(display.absY(18)).to.equal(8);
            expect(canvas.clientWidth).to.equal(9);
            expect(canvas.clientHeight).to.equal(7); // round 9 / (4 / 3)
        });

        it('should use height to determine scale when the current aspect ratio is taller than the target', function () {
            display.autoscale(16, 9);
            expect(display.absX(9)).to.equal(3);
            expect(display.absY(18)).to.equal(6);
            expect(canvas.clientWidth).to.equal(12);  // 16 * (4 / 3)
            expect(canvas.clientHeight).to.equal(9);

        });

        it('should not change the bitmap size of the canvas', function () {
            display.autoscale(16, 9);
            expect(canvas.width).to.equal(4);
            expect(canvas.height).to.equal(3);
        });

        it('should not upscale when downscaleOnly is true', function () {
            display.autoscale(2, 2, true);
            expect(display.absX(9)).to.equal(18);
            expect(display.absY(18)).to.equal(36);
            expect(canvas.clientWidth).to.equal(2);
            expect(canvas.clientHeight).to.equal(2);

            display.autoscale(16, 9, true);
            expect(display.absX(9)).to.equal(9);
            expect(display.absY(18)).to.equal(18);
            expect(canvas.clientWidth).to.equal(4);
            expect(canvas.clientHeight).to.equal(3);
        });
    });

    describe('drawing', function () {

        // TODO(directxman12): improve the tests for each of the drawing functions to cover more than just the
        //                     basic cases
        function drawing_tests (pref_js) {
            var display;
            beforeEach(function () {
                display = new Display({ target: document.createElement('canvas'), prefer_js: pref_js });
                display.resize(4, 4);
            });

            it('should clear the screen on #clear without a logo set', function () {
                display.fillRect(0, 0, 4, 4, [0x00, 0x00, 0xff]);
                display._logo = null;
                display.clear();
                display.resize(4, 4);
                var empty = [];
                for (var i = 0; i < 4 * display._fb_width * display._fb_height; i++) { empty[i] = 0; }
                expect(display).to.have.displayed(new Uint8Array(empty));
            });

            it('should draw the logo on #clear with a logo set', function (done) {
                display._logo = { width: 4, height: 4, type: "image/png", data: make_image_png(checked_data) };
                display.clear();
                display.set_onFlush(function () {
                    expect(display).to.have.displayed(checked_data);
                    expect(display._fb_width).to.equal(4);
                    expect(display._fb_height).to.equal(4);
                    done();
                });
                display.flush();
            });

            it('should not draw directly on the target canvas', function () {
                display.fillRect(0, 0, 4, 4, [0, 0, 0xff]);
                display.flip();
                display.fillRect(0, 0, 4, 4, [0, 0xff, 0]);
                var expected = [];
                for (var i = 0; i < 4 * display._fb_width * display._fb_height; i += 4) {
                    expected[i] = 0xff;
                    expected[i+1] = expected[i+2] = 0;
                    expected[i+3] = 0xff;
                }
                expect(display).to.have.displayed(new Uint8Array(expected));
            });

            it('should support filling a rectangle with particular color via #fillRect', function () {
                display.fillRect(0, 0, 4, 4, [0, 0xff, 0]);
                display.fillRect(0, 0, 2, 2, [0xff, 0, 0]);
                display.fillRect(2, 2, 2, 2, [0xff, 0, 0]);
                display.flip();
                expect(display).to.have.displayed(checked_data);
            });

            it('should support copying an portion of the canvas via #copyImage', function () {
                display.fillRect(0, 0, 4, 4, [0, 0xff, 0]);
                display.fillRect(0, 0, 2, 2, [0xff, 0, 0x00]);
                display.copyImage(0, 0, 2, 2, 2, 2);
                display.flip();
                expect(display).to.have.displayed(checked_data);
            });

            it('should support drawing images via #imageRect', function (done) {
                display.imageRect(0, 0, "image/png", make_image_png(checked_data));
                display.flip();
                display.set_onFlush(function () {
                    expect(display).to.have.displayed(checked_data);
                    done();
                });
                display.flush();
            });

            it('should support drawing tile data with a background color and sub tiles', function () {
                display.startTile(0, 0, 4, 4, [0, 0xff, 0]);
                display.subTile(0, 0, 2, 2, [0xff, 0, 0]);
                display.subTile(2, 2, 2, 2, [0xff, 0, 0]);
                display.finishTile();
                display.flip();
                expect(display).to.have.displayed(checked_data);
            });

            it('should support drawing BGRX blit images with true color via #blitImage', function () {
                var data = [];
                for (var i = 0; i < 16; i++) {
                    data[i * 4] = checked_data[i * 4 + 2];
                    data[i * 4 + 1] = checked_data[i * 4 + 1];
                    data[i * 4 + 2] = checked_data[i * 4];
                    data[i * 4 + 3] = checked_data[i * 4 + 3];
                }
                display.blitImage(0, 0, 4, 4, data, 0);
                display.flip();
                expect(display).to.have.displayed(checked_data);
            });

            it('should support drawing RGB blit images with true color via #blitRgbImage', function () {
                var data = [];
                for (var i = 0; i < 16; i++) {
                    data[i * 3] = checked_data[i * 4];
                    data[i * 3 + 1] = checked_data[i * 4 + 1];
                    data[i * 3 + 2] = checked_data[i * 4 + 2];
                }
                display.blitRgbImage(0, 0, 4, 4, data, 0);
                display.flip();
                expect(display).to.have.displayed(checked_data);
            });

            it('should support drawing solid colors with color maps', function () {
                display._true_color = false;
                display.set_colourMap({ 0: [0xff, 0, 0], 1: [0, 0xff, 0] });
                display.fillRect(0, 0, 4, 4, 1);
                display.fillRect(0, 0, 2, 2, 0);
                display.fillRect(2, 2, 2, 2, 0);
                display.flip();
                expect(display).to.have.displayed(checked_data);
            });

            it('should support drawing blit images with color maps', function () {
                display._true_color = false;
                display.set_colourMap({ 1: [0xff, 0, 0], 0: [0, 0xff, 0] });
                var data = [1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1].map(function (elem) { return [elem]; });
                display.blitImage(0, 0, 4, 4, data, 0);
                display.flip();
                expect(display).to.have.displayed(checked_data);
            });

            it('should support drawing an image object via #drawImage', function () {
                var img = make_image_canvas(checked_data);
                display.drawImage(img, 0, 0);
                display.flip();
                expect(display).to.have.displayed(checked_data);
            });
        }

        describe('(prefering native methods)', function () { drawing_tests.call(this, false); });
        describe('(prefering JavaScript)', function () { drawing_tests.call(this, true); });
    });

    describe('the render queue processor', function () {
        var display;
        beforeEach(function () {
            display = new Display({ target: document.createElement('canvas'), prefer_js: false });
            display.resize(4, 4);
            sinon.spy(display, '_scan_renderQ');
        });

        afterEach(function () {
            window.requestAnimationFrame = this.old_requestAnimationFrame;
        });

        it('should try to process an item when it is pushed on, if nothing else is on the queue', function () {
            display._renderQ_push({ type: 'noop' });  // does nothing
            expect(display._scan_renderQ).to.have.been.calledOnce;
        });

        it('should not try to process an item when it is pushed on if we are waiting for other items', function () {
            display._renderQ.length = 2;
            display._renderQ_push({ type: 'noop' });
            expect(display._scan_renderQ).to.not.have.been.called;
        });

        it('should wait until an image is loaded to attempt to draw it and the rest of the queue', function () {
            var img = { complete: false, addEventListener: sinon.spy() }
            display._renderQ = [{ type: 'img', x: 3, y: 4, img: img },
                                { type: 'fill', x: 1, y: 2, width: 3, height: 4, color: 5 }];
            display.drawImage = sinon.spy();
            display.fillRect = sinon.spy();

            display._scan_renderQ();
            expect(display.drawImage).to.not.have.been.called;
            expect(display.fillRect).to.not.have.been.called;
            expect(img.addEventListener).to.have.been.calledOnce;

            display._renderQ[0].img.complete = true;
            display._scan_renderQ();
            expect(display.drawImage).to.have.been.calledOnce;
            expect(display.fillRect).to.have.been.calledOnce;
            expect(img.addEventListener).to.have.been.calledOnce;
        });

        it('should call callback when queue is flushed', function () {
            display.set_onFlush(sinon.spy());
            display.fillRect(0, 0, 4, 4, [0, 0xff, 0]);
            expect(display.get_onFlush()).to.not.have.been.called;
            display.flush();
            expect(display.get_onFlush()).to.have.been.calledOnce;
        });

        it('should draw a blit image on type "blit"', function () {
            display.blitImage = sinon.spy();
            display._renderQ_push({ type: 'blit', x: 3, y: 4, width: 5, height: 6, data: [7, 8, 9] });
            expect(display.blitImage).to.have.been.calledOnce;
            expect(display.blitImage).to.have.been.calledWith(3, 4, 5, 6, [7, 8, 9], 0);
        });

        it('should draw a blit RGB image on type "blitRgb"', function () {
            display.blitRgbImage = sinon.spy();
            display._renderQ_push({ type: 'blitRgb', x: 3, y: 4, width: 5, height: 6, data: [7, 8, 9] });
            expect(display.blitRgbImage).to.have.been.calledOnce;
            expect(display.blitRgbImage).to.have.been.calledWith(3, 4, 5, 6, [7, 8, 9], 0);
        });

        it('should copy a region on type "copy"', function () {
            display.copyImage = sinon.spy();
            display._renderQ_push({ type: 'copy', x: 3, y: 4, width: 5, height: 6, old_x: 7, old_y: 8 });
            expect(display.copyImage).to.have.been.calledOnce;
            expect(display.copyImage).to.have.been.calledWith(7, 8, 3, 4, 5, 6);
        });

        it('should fill a rect with a given color on type "fill"', function () {
            display.fillRect = sinon.spy();
            display._renderQ_push({ type: 'fill', x: 3, y: 4, width: 5, height: 6, color: [7, 8, 9]});
            expect(display.fillRect).to.have.been.calledOnce;
            expect(display.fillRect).to.have.been.calledWith(3, 4, 5, 6, [7, 8, 9]);
        });

        it('should draw an image from an image object on type "img" (if complete)', function () {
            display.drawImage = sinon.spy();
            display._renderQ_push({ type: 'img', x: 3, y: 4, img: { complete: true } });
            expect(display.drawImage).to.have.been.calledOnce;
            expect(display.drawImage).to.have.been.calledWith({ complete: true }, 3, 4);
        });
    });
});