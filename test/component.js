var expect = require('expect.js');
var hyperd = require('../');

describe('Component', function() {
  beforeEach(function() {
    this.node = document.createElement('div');
    document.body.appendChild(this.node);
  });

  afterEach(function() {
    document.body.removeChild(this.node);
  });

  describe('#attachTo', function() {
    it('should attach to the node', function() {
      var Component = hyperd.Component.extend({
        render: function() { return '<div/>'; }
      });
      var component = new Component().attachTo(this.node);
      expect(component.node).to.be(this.node);
      component.destroy();
    });
  });

  describe('#render', function() {
    it('should create html text', function() {
      var Component = hyperd.Component.extend({
        render: function() {
          return '<div>' + this.props.greeting + '</div>';
        }
      });
      var component = new Component({ greeting: 'hi' });
      expect(component.render()).to.be('<div>hi</div>');
      component.destroy();
    });
  });

  describe('#emit', function() {
    it('should dispatch a custom dom event', function(done) {
      var Main = hyperd.Component.extend({
        render: function() {
          return '<div class="main"/>';
        },
        onRender: function() {
          this.emit('foo', 'hi');
        }
      });
      var App = hyperd.Component.extend({
        components: {
          main: Main
        },
        constructor: function() {
          hyperd.Component.apply(this, arguments);
          this.on('foo', '.main', function(e, v) {
            expect(v).to.eql('hi');
            this.destroy();
            done();
          });
        },
        render: function() {
          return '<div><main/></div>';
        }
      });
      new App().attachTo(this.node);
    });
  });

  describe('#on', function() {
    it('should listen a delegated event', function(done) {
      var Component = hyperd.Component.extend({
        render: function() {
          return '<div><button>b</button></div>';
        }
      });
      var component = new Component().attachTo(this.node);
      component
        .on('click', 'button', function(e) {
          expect(this).to.be(component);
          component.destroy();
          done();
        })
        .on('render', function() {
          this.node.querySelector('button').click();
        });
    });
  });

  describe('#removeListener', function() {
    it('should not listen a delegated event', function(done) {
      var Component = hyperd.Component.extend({
        render: function() {
          return '<div><button>b</button></div>';
        }
      });
      var component = new Component().attachTo(this.node);
      component
        .on('click', 'button', onclick)
        .on('render', function() {
          this.removeListener('click', 'button', onclick);
          this.node.querySelector('button').click();
          // wait for a potential event call;
          setTimeout(function() {
            component.destroy();
            done();
          }, 100);
        });

      function onclick() {
        expect().fail('Unexpectedly called');
      }
    });
  });

  describe('#onAttach', function() {
    it('should be triggered upon attachTo', function(done) {
      var self = this;
      var called = false;
      var Component = hyperd.Component.extend({
        render: function() {
          return '<div/>';
        },
        onAttach: function() {
          expect(called).to.be.ok();
          done();
        }
      });
      var component = new Component();
      // wait for possible event call
      setTimeout(function() {
        called = true;
        component.attachTo(self.node);
      }, 500);
    });
  });

  it('should render html', function(done) {
    var Component = hyperd.Component.extend({
      render: function() {
        return '<div>' + this.props.greeting + '</div>';
      },
      onRender: function() {
        expect(this.props.greeting).to.be('hi');
        expect(this.node.innerHTML).to.be('hi')
        this.destroy();
        done();
      }
    });
    new Component({ greeting: 'hi' }).attachTo(this.node);
  });

  it('should re-render when data changed', function(done) {
    var Component = hyperd.Component.extend({
      constructor: function() {
        hyperd.Component.apply(this, arguments);
        this.data.count = 0;
      },
      render: function() {
        return '<div>' + this.data.count + '</div>';
      },
      onRender: function() {
        expect(this.node.innerHTML).to.be('' + this.data.count);
        this.data.count++;
        if (this.data.count > 10) {
          this.destroy();
          done();
        }
      }
    });
    new Component().attachTo(this.node);
  });

  it('should render a nested component', function(done) {
    var Main = hyperd.Component.extend({
      render: function() {
        return '<span>' + this.props.greeting + '</span>';
      }
    });
    var App = hyperd.Component.extend({
      components: {
        main: Main
      },
      render: function() {
        return '<div><main greeting="hi"/></div>';
      },
      onRender: function() {
        expect(this.node.innerHTML).to.be('<span>hi</span>');
        this.destroy();
        done();
      }
    });
    new App().attachTo(this.node);
  });

  it('should re-render a child component', function(done) {
    var Child = hyperd.Component.extend({
      constructor: function() {
        hyperd.Component.apply(this, arguments);
        this.data.count = 0;
      },
      render: function() {
        return '<div>' + this.data.count + '</div>';
      },
      onRender: function() {
        expect(this.node.innerHTML).to.be('' + this.data.count);
        this.data.count++;
        if (this.data.count > 5) {
          parent.destroy();
          done();
        }
      }
    });
    var Parent = hyperd.Component.extend({
      components: {
        child: Child
      },
      render: function() {
        return '<div><child/></div>';
      }
    });
    var parent = new Parent().attachTo(this.node);
  });

  it('should not render when data didn\'t change', function(done) {
    var Component = hyperd.Component.extend({
      constructor: function() {
        hyperd.Component.apply(this, arguments);
        this.called = false;
      },
      render: function() {
        return '<div>' + this.data + '</div>';
      },
      onRender: function() {
        if (this.called) {
          expect().fail('Unexpectedly called');
          return;
        }

        this.called = true;
        expect(this.node.innerHTML).to.be('hi')
        this.data = 'hi';

        var self = this;
        // wait for possible re-rendering
        setTimeout(function() {
          self.destroy();
          done();
        }, 100);
      }
    });
    var component = new Component().attachTo(this.node);
    component.data = 'hi';
  });

  it('should set key', function(done) {
    this.node.dataset.hkey = 'foo';
    var Component = hyperd.Component.extend({
      render: function() {
        return '<div data-hkey="foo"/>';
      },
      onRender: function() {
        expect(this.node.dataset.hkey).to.be('foo');
        expect(this.tree.key).to.be('foo');
        this.destroy();
        done();
      }
    });
    new Component().attachTo(this.node);
  });
});
