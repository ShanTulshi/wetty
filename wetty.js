var express = require('express');
var http = require('http');
var https = require('https');
var path = require('path');
var server = require('socket.io');
var pty = require('pty.js');
var fs = require('fs');

var router = express.Router();

module.exports = function(httpserv, opts) {
  var runhttps = false;
  var sshport = 22;
  var sshhost = 'localhost';
  var sshauth = 'password,keyboard-interactive';
  // var sockpath = '/wetty/socket.io/';
  var globalsshuser = '';

  if (opts.sshport) {
      sshport = opts.sshport;
  }

  if (opts.sshhost) {
      sshhost = opts.sshhost;
  }

  if (opts.sshauth) {
  	sshauth = opts.sshauth
  }

  if (opts.sshuser) {
      globalsshuser = opts.sshuser;
  }

  if (opts.sslkey && opts.sslcert) {
      runhttps = true;
      opts['ssl'] = {};
      opts.ssl['key'] = fs.readFileSync(path.resolve(opts.sslkey));
      opts.ssl['cert'] = fs.readFileSync(path.resolve(opts.sslcert));
  }

  if (opts.path) {
    sockpath = opts.path;
  }

  // GIB STACKTRACE PLS
  // process.on('uncaughtException', function(e) {
  //     console.error('Error: ' + e);
  // });

  router.get('/ssh/:user', function(req, res) {
      res.sendfile(__dirname + '/public/wetty/index.html');
  });
  router.use('/', express.static(path.join(__dirname, 'public/wetty')));

  // if (runhttps) {
  //     httpserv = https.createServer(opts.ssl, router).listen(opts.port, function() {
  //         console.log('https on port ' + opts.port);
  //     });
  // } else {
  //     httpserv = http.createServer(router).listen(opts.port, function() {
  //         console.log('http on port ' + opts.port);
  //     });
  // }

  // var io = server(httpserv, {path: sockpath});
  var io = server(httpserv, { path: '/wetty/socket.io' });
  io.on('connection', function(socket){
      var sshuser = '';
      var request = socket.request;
      console.log((new Date()) + ' Connection accepted.');
      if (match = request.headers.referer.match('/wetty/ssh/.+$')) {
          sshuser = match[0].replace('/wetty/ssh/', '') + '@';
      } else if (globalsshuser) {
          sshuser = globalsshuser + '@';
      }

      // if (process.getuid() == -1) {
      //     term = pty.spawn('/usr/bin/env', ['login'], {
      //         name: 'xterm-256color',
      //         cols: 80,
      //         rows: 30
      //     });
      // } else {
      var term = pty.spawn('ssh', [sshuser + sshhost, '-p', sshport, '-o', 'PreferredAuthentications=' + sshauth], {
          name: 'xterm-256color',
          cols: 80,
          rows: 30
          }
        );
      // }
      console.log((new Date()) + " PID=" + term.pid + " STARTED on behalf of user=" + sshuser)
      term.on('data', function(data) {
          socket.emit('output', data);
      });
      term.on('exit', function(code) {
          console.log((new Date()) + " PID=" + term.pid + " ENDED")
      });
      socket.on('resize', function(data) {
          term.resize(data.col, data.row);
      });
      socket.on('input', function(data) {
          term.write(data);
      });
      socket.on('disconnect', function() {
          term.end();
      });
  })
  return router;
}
