/* This module is a stripped version of npm package sudo-prompt, which we are already using in our application */
/* This has been created to set WindowStyle to Minimized instead of hidden for Windows. */
/* This has been done to handle systems on which users have restricted access to powershell */

/* eslint-disable */
var Node = {
  child: require('child_process'),
  crypto: require('crypto'),
  fs: require('fs'),
  os: require('os'),
  path: require('path'),
  process: process,
  util: require('util')
};

function Attempt(instance, end) {
  var platform = Node.process.platform;
  if (platform === 'win32') return Windows(instance, end);
  end(new Error('Platform not yet supported.'));
}

function EscapeDoubleQuotes(string) {
  if (typeof string !== 'string') throw new Error('Expected a string.');
  return string.replace(/"/g, '\\"');
}

function Exec() {
  if (arguments.length < 1 || arguments.length > 3) {
    throw new Error('Wrong number of arguments.');
  }
  var command = arguments[0];
  var options = {};
  var end = function () { };
  if (typeof command !== 'string') {
    throw new Error('Command should be a string.');
  }
  if (arguments.length === 2) {
    if (Node.util.isObject(arguments[1])) {
      options = arguments[1];
    } else if (Node.util.isFunction(arguments[1])) {
      end = arguments[1];
    } else {
      throw new Error('Expected options or callback.');
    }
  } else if (arguments.length === 3) {
    if (Node.util.isObject(arguments[1])) {
      options = arguments[1];
    } else {
      throw new Error('Expected options to be an object.');
    }
    if (Node.util.isFunction(arguments[2])) {
      end = arguments[2];
    } else {
      throw new Error('Expected callback to be a function.');
    }
  }
  if (/^sudo/i.test(command)) {
    return end(new Error('Command should not be prefixed with "sudo".'));
  }
  if (typeof options.name === 'undefined') {
    var title = Node.process.title;
    if (ValidName(title)) {
      options.name = title;
    } else {
      return end(new Error('process.title cannot be used as a valid name.'));
    }
  } else if (!ValidName(options.name)) {
    var error = '';
    error += 'options.name must be alphanumeric only ';
    error += '(spaces are allowed) and <= 70 characters.';
    return end(new Error(error));
  }
  if (typeof options.icns !== 'undefined') {
    if (typeof options.icns !== 'string') {
      return end(new Error('options.icns must be a string if provided.'));
    } else if (options.icns.trim().length === 0) {
      return end(new Error('options.icns must not be empty if provided.'));
    }
  }
  if (typeof options.env !== 'undefined') {
    if (typeof options.env !== 'object') {
      return end(new Error('options.env must be an object if provided.'));
    } else if (Object.keys(options.env).length === 0) {
      return end(new Error('options.env must not be empty if provided.'));
    } else {
      for (var key in options.env) {
        var value = options.env[key];
        if (typeof key !== 'string' || typeof value !== 'string') {
          return end(
            new Error('options.env environment variables must be strings.')
          );
        }
        // "Environment variable names used by the utilities in the Shell and
        // Utilities volume of IEEE Std 1003.1-2001 consist solely of uppercase
        // letters, digits, and the '_' (underscore) from the characters defined
        // in Portable Character Set and do not begin with a digit. Other
        // characters may be permitted by an implementation; applications shall
        // tolerate the presence of such names."
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
          return end(
            new Error(
              'options.env has an invalid environment variable name: ' +
              JSON.stringify(key)
            )
          );
        }
        if (/[\r\n]/.test(value)) {
          return end(
            new Error(
              'options.env has an invalid environment variable value: ' +
              JSON.stringify(value)
            )
          );
        }
      }
    }
  }
  var platform = Node.process.platform;
  if (platform !== 'win32') {
    return end(new Error('Platform not yet supported.'));
  }
  var instance = {
    command: command,
    options: options,
    uuid: undefined,
    path: undefined
  };
  Attempt(instance, end);
}

function Remove(path, end) {
  if (typeof path !== 'string' || !path.trim()) {
    return end(new Error('Argument path not defined.'));
  }
  var command = [];
  if (Node.process.platform === 'win32') {
    if (/"/.test(path)) {
      return end(new Error('Argument path cannot contain double-quotes.'));
    }
    command.push('rmdir /s /q "' + path + '"');
  } else {
    command.push('/bin/rm');
    command.push('-rf');
    command.push('"' + EscapeDoubleQuotes(Node.path.normalize(path)) + '"');
  }
  command = command.join(' ');
  Node.child.exec(command, { encoding: 'utf-8' }, end);
}

function UUID(instance, end) {
  Node.crypto.randomBytes(256,
    function (error, random) {
      if (error) random = Date.now() + '' + Math.random();
      var hash = Node.crypto.createHash('SHA256');
      hash.update('sudo-prompt-3');
      hash.update(instance.options.name);
      hash.update(instance.command);
      hash.update(random);
      var uuid = hash.digest('hex').slice(-32);
      if (!uuid || typeof uuid !== 'string' || uuid.length !== 32) {
        // This is critical to ensure we don't remove the wrong temp directory.
        return end(new Error('Expected a valid UUID.'));
      }
      end(undefined, uuid);
    }
  );
}

function ValidName(string) {
  // We use 70 characters as a limit to side-step any issues with Unicode
  // normalization form causing a 255 character string to exceed the fs limit.
  if (!/^[a-z0-9 ]+$/i.test(string)) return false;
  if (string.trim().length === 0) return false;
  if (string.length > 70) return false;
  return true;
}

function Windows(instance, callback) {
  var temp = Node.os.tmpdir();
  if (!temp) return callback(new Error('os.tmpdir() not defined.'));
  UUID(instance,
    function (error, uuid) {
      if (error) return callback(error);
      instance.uuid = uuid;
      instance.path = Node.path.join(temp, instance.uuid);
      if (/"/.test(instance.path)) {
        // We expect double quotes to be reserved on Windows.
        // Even so, we test for this and abort if they are present.
        return callback(
          new Error('instance.path cannot contain double-quotes.')
        );
      }
      instance.pathElevate = Node.path.join(instance.path, 'elevate.vbs');
      instance.pathExecute = Node.path.join(instance.path, 'execute.bat');
      instance.pathCommand = Node.path.join(instance.path, 'command.bat');
      instance.pathStdout = Node.path.join(instance.path, 'stdout');
      instance.pathStderr = Node.path.join(instance.path, 'stderr');
      instance.pathStatus = Node.path.join(instance.path, 'status');
      Node.fs.mkdir(instance.path,
        function (error) {
          if (error) return callback(error);
          function end(error, stdout, stderr) {
            Remove(instance.path,
              function (errorRemove) {
                if (error) return callback(error);
                if (errorRemove) return callback(errorRemove);
                callback(undefined, stdout, stderr);
              }
            );
          }
          WindowsWriteExecuteScript(instance,
            function (error) {
              if (error) return end(error);
              WindowsWriteCommandScript(instance,
                function (error) {
                  if (error) return end(error);
                  WindowsElevate(instance,
                    function (error, stdout, stderr) {
                      if (error) return end(error, stdout, stderr);
                      WindowsWaitForStatus(instance,
                        function (error) {
                          if (error) return end(error);
                          WindowsResult(instance, end);
                        }
                      );
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
}

function WindowsElevate(instance, end) {
  // We used to use this for executing elevate.vbs:
  // var command = 'cscript.exe //NoLogo "' + instance.pathElevate + '"';
  var command = [];
  command.push('powershell.exe');
  command.push('Start-Process');
  command.push('-FilePath');
  // Escape characters for cmd using double quotes:
  // Escape characters for PowerShell using single quotes:
  // Escape single quotes for PowerShell using backtick:
  // See: https://ss64.com/ps/syntax-esc.html
  command.push('"\'' + instance.pathExecute.replace(/'/g, "`'") + '\'"');
  /* WindowStyle adjustment for restricted PowerShell access, when hidden option doesn't work */
  command.push('-WindowStyle Minimized');
  command.push('-Verb runAs');
  command = command.join(' ');
  var child = Node.child.exec(command, { encoding: 'utf-8' },
    function (error, stdout, stderr) {
      // We used to return PERMISSION_DENIED only for error messages containing
      // the string 'canceled by the user'. However, Windows internationalizes
      // error messages (issue 96) so now we must assume all errors here are
      // permission errors. This seems reasonable, given that we already run the
      // user's command in a subshell.
      if (error) return end(new Error(PERMISSION_DENIED), stdout, stderr);
      end();
    }
  );
  child.stdin.end(); // Otherwise PowerShell waits indefinitely on Windows 7.
}

function WindowsResult(instance, end) {
  Node.fs.readFile(instance.pathStatus, 'utf-8',
    function (error, code) {
      if (error) return end(error);
      Node.fs.readFile(instance.pathStdout, 'utf-8',
        function (error, stdout) {
          if (error) return end(error);
          Node.fs.readFile(instance.pathStderr, 'utf-8',
            function (error, stderr) {
              if (error) return end(error);
              code = parseInt(code.trim(), 10);
              if (code === 0) {
                end(undefined, stdout, stderr);
              } else {
                error = new Error(
                  'Command failed: ' + instance.command + '\r\n' + stderr
                );
                error.code = code;
                end(error, stdout, stderr);
              }
            }
          );
        }
      );
    }
  );
}

function WindowsWaitForStatus(instance, end) {
  // VBScript cannot wait for the elevated process to finish so we have to poll.
  // VBScript cannot return error code if user does not grant permission.
  // PowerShell can be used to elevate and wait on Windows 10.
  // PowerShell can be used to elevate on Windows 7 but it cannot wait.
  // powershell.exe Start-Process cmd.exe -Verb runAs -Wait
  Node.fs.stat(instance.pathStatus,
    function (error, stats) {
      if ((error && error.code === 'ENOENT') || stats.size < 2) {
        // Retry if file does not exist or is not finished writing.
        // We expect a file size of 2. That should cover at least "0\r".
        // We use a 1 second timeout to keep a light footprint for long-lived
        // sudo-prompt processes.
        setTimeout(
          function () {
            // If administrator has no password and user clicks Yes, then
            // PowerShell returns no error and execute (and command) never runs.
            // We check that command output has been redirected to stdout file:
            Node.fs.stat(instance.pathStdout,
              function (error) {
                if (error) return end(new Error(PERMISSION_DENIED));
                WindowsWaitForStatus(instance, end);
              }
            );
          },
          1000
        );
      } else if (error) {
        end(error);
      } else {
        end();
      }
    }
  );
}

function WindowsWriteCommandScript(instance, end) {
  var cwd = Node.process.cwd();
  if (/"/.test(cwd)) {
    // We expect double quotes to be reserved on Windows.
    // Even so, we test for this and abort if they are present.
    return end(new Error('process.cwd() cannot contain double-quotes.'));
  }
  var script = [];
  script.push('@echo off');
  // Set code page to UTF-8:
  script.push('chcp 65001>nul');
  // Preserve current working directory:
  // We pass /d as an option in case the cwd is on another drive (issue 70).
  script.push('cd /d "' + cwd + '"');
  // Export environment variables:
  for (var key in instance.options.env) {
    // "The characters <, >, |, &, ^ are special command shell characters, and
    // they must be preceded by the escape character (^) or enclosed in
    // quotation marks. If you use quotation marks to enclose a string that
    // contains one of the special characters, the quotation marks are set as
    // part of the environment variable value."
    // In other words, Windows assigns everything that follows the equals sign
    // to the value of the variable, whereas Unix systems ignore double quotes.
    var value = instance.options.env[key];
    script.push('set ' + key + '=' + value.replace(/([<>\\|&^])/g, '^$1'));
  }
  script.push(instance.command);
  script = script.join('\r\n');
  Node.fs.writeFile(instance.pathCommand, script, 'utf-8', end);
}

function WindowsWriteElevateScript(instance, end) {
  // We do not use VBScript to elevate since it does not return an error if
  // the user does not grant permission. This is here for reference.
  // var script = [];
  // script.push('Set objShell = CreateObject("Shell.Application")');
  // script.push(
  // 'objShell.ShellExecute "' + instance.pathExecute + '", "", "", "runas", 0'
  // );
  // script = script.join('\r\n');
  // Node.fs.writeFile(instance.pathElevate, script, 'utf-8', end);
}

function WindowsWriteExecuteScript(instance, end) {
  var script = [];
  script.push('@echo off');
  script.push(
    'call "' + instance.pathCommand + '"' +
    ' > "' + instance.pathStdout + '" 2> "' + instance.pathStderr + '"'
  );
  script.push('(echo %ERRORLEVEL%) > "' + instance.pathStatus + '"');
  script = script.join('\r\n');
  Node.fs.writeFile(instance.pathExecute, script, 'utf-8', end);
}

module.exports.exec = Exec;

var PERMISSION_DENIED = 'User did not grant permission.';
