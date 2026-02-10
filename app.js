(function () {
  console.log('[registro-app] script cargado');
  const form = document.getElementById('registro-form');
  if (!form) {
    console.log('[registro-app] ERROR: no se encontró #registro-form');
    return;
  }
  const formView = document.getElementById('form-view');
  const successView = document.getElementById('success-view');
  const globalError = document.getElementById('global-error');
  const btnSubmit = document.getElementById('btn-submit');

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const cuentaRegex = /^[a-zA-Z0-9_]{3,30}$/;

  function getField(name) {
    return form.querySelector('[name="' + name + '"]');
  }

  function getFieldContainer(name) {
    return form.querySelector('.field[data-name="' + name + '"]');
  }

  function getMsgEl(name) {
    return document.getElementById('msg-' + name);
  }

  function setFieldState(name, state, message) {
    var container = getFieldContainer(name);
    var wrap = container && container.querySelector('.field-wrap');
    var icon = wrap && wrap.querySelector('.icon');
    var msgEl = getMsgEl(name);
    if (!container) return;
    container.classList.remove('input-valid', 'input-invalid', 'input-error');
    if (icon) {
      icon.textContent = '';
      icon.className = 'icon';
    }
    if (msgEl) msgEl.textContent = '';
    if (state === 'valid') {
      container.classList.add('input-valid');
      if (icon) {
        icon.className = 'icon valid';
        icon.textContent = '✓';
      }
    } else if (state === 'invalid' || state === 'error') {
      container.classList.add(state === 'error' ? 'input-error' : 'input-invalid');
      if (icon) {
        icon.className = 'icon ' + (state === 'error' ? 'error' : 'invalid');
        icon.textContent = '⚠';
      }
      if (msgEl && message) msgEl.textContent = message;
    }
  }

  function validateCuenta(value) {
    value = (value || '').trim();
    if (!value) return { ok: false, msg: 'El nombre de cuenta es obligatorio.' };
    if (!cuentaRegex.test(value)) return { ok: false, msg: 'Solo letras, números y guión bajo (3-30 caracteres).' };
    return { ok: true };
  }

  function validatePass(value) {
    if (!value) return { ok: false, msg: 'La contraseña es obligatoria.' };
    if (value.length < 4) return { ok: false, msg: 'Mínimo 4 caracteres.' };
    return { ok: true };
  }

  function validatePass2(value, pass) {
    if (!value) return { ok: false, msg: 'Confirma la contraseña.' };
    if (value !== pass) return { ok: false, msg: 'Las contraseñas no coinciden.' };
    return { ok: true };
  }

  function validateRequired(value, label) {
    if (!(value || '').trim()) return { ok: false, msg: label + ' es obligatorio.' };
    return { ok: true };
  }

  function validateEmail(value) {
    value = (value || '').trim();
    if (!value) return { ok: false, msg: 'El email es obligatorio.' };
    if (!emailRegex.test(value)) return { ok: false, msg: 'Email no válido.' };
    return { ok: true };
  }

  function validateApodo(value) {
    value = (value || '').trim();
    if (!value) return { ok: false, msg: 'El apodo es obligatorio.' };
    if (value.length > 30) return { ok: false, msg: 'Máximo 30 caracteres.' };
    return { ok: true };
  }

  function runValidation() {
    var cuenta = (getField('cuenta') && getField('cuenta').value) || '';
    var pass = (getField('pass') && getField('pass').value) || '';
    var pass2 = (getField('pass2') && getField('pass2').value) || '';
    var nombre = (getField('nombre') && getField('nombre').value) || '';
    var apellido = (getField('apellido') && getField('apellido').value) || '';
    var pais = (getField('pais') && getField('pais').value) || '';
    var email = (getField('email') && getField('email').value) || '';
    var apodo = (getField('apodo') && getField('apodo').value) || '';

    var allOk = true;

    var r = validateCuenta(cuenta);
    setFieldState('cuenta', r.ok ? 'valid' : 'error', r.msg);
    if (!r.ok) allOk = false;

    r = validatePass(pass);
    setFieldState('pass', r.ok ? 'valid' : 'error', r.msg);
    if (!r.ok) allOk = false;

    r = validatePass2(pass2, pass);
    setFieldState('pass2', r.ok ? 'valid' : 'error', r.msg);
    if (!r.ok) allOk = false;

    r = validateRequired(nombre, 'El nombre');
    setFieldState('nombre', r.ok ? 'valid' : 'error', r.msg);
    if (!r.ok) allOk = false;

    r = validateRequired(apellido, 'El apellido');
    setFieldState('apellido', r.ok ? 'valid' : 'error', r.msg);
    if (!r.ok) allOk = false;

    r = validateRequired(pais, 'El país');
    setFieldState('pais', r.ok ? 'valid' : 'error', r.msg);
    if (!r.ok) allOk = false;

    r = validateEmail(email);
    setFieldState('email', r.ok ? 'valid' : 'error', r.msg);
    if (!r.ok) allOk = false;

    r = validateApodo(apodo);
    setFieldState('apodo', r.ok ? 'valid' : 'error', r.msg);
    if (!r.ok) allOk = false;

    return allOk;
  }

  function showGlobalError(msg) {
    globalError.textContent = msg;
    globalError.classList.add('visible');
  }

  function hideGlobalError() {
    globalError.classList.remove('visible');
    globalError.textContent = '';
  }

  function showSuccess() {
    formView.classList.add('hidden');
    successView.classList.add('visible');
  }

  function enviarRegistro() {
    console.log('[registro-app] enviarRegistro() llamado');
    hideGlobalError();
    if (!runValidation()) {
      console.log('[registro-app] validación fallida');
      showGlobalError('Revisa los campos marcados y complétalos correctamente.');
      return;
    }
    if (btnSubmit) btnSubmit.disabled = true;
    var formData = new FormData(form);
    formData.delete('pass2');
    var body = Object.fromEntries(formData);
    console.log('[registro-app] enviando al BE (cuenta, email, etc.):', { cuenta: body.cuenta, email: body.email, nombre: body.nombre, apellido: body.apellido, pais: body.pais, apodo: body.apodo });
    fetch('/api/registro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
      .then(function (res) {
        return res.json().then(function (data) {
          console.log('[registro-app] respuesta del BE recibida:', res.status, data);
          return { ok: res.ok, data: data };
        });
      })
      .then(function (result) {
        if (result.ok && result.data && result.data.success) {
          console.log('[registro-app] OK: información enviada al BE correctamente, registro exitoso');
          showSuccess();
        } else {
          console.log('[registro-app] BE respondió con error:', result.data);
          showGlobalError((result.data && result.data.message) || 'Error al registrar. Intenta de nuevo.');
          if (btnSubmit) btnSubmit.disabled = false;
        }
      })
      .catch(function (err) {
        console.log('[registro-app] error de conexión al BE:', err);
        showGlobalError('Error de conexión. Comprueba que el servidor esté activo.');
        if (btnSubmit) btnSubmit.disabled = false;
      });
  }

  if (btnSubmit) {
    btnSubmit.addEventListener('click', function (e) {
      e.preventDefault();
      console.log('[registro-app] botón Registrarme clicado');
      enviarRegistro();
    });
    console.log('[registro-app] listener de clic en botón registrado');
  } else {
    console.log('[registro-app] ERROR: no se encontró #btn-submit');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    e.stopPropagation();
    console.log('[registro-app] form submit (ej. Enter)');
    enviarRegistro();
  });

  ['cuenta', 'pass', 'pass2', 'nombre', 'apellido', 'pais', 'email', 'apodo'].forEach(function (name) {
    var input = getField(name);
    if (input) {
      input.addEventListener('blur', function () {
        if (formView.classList.contains('hidden')) return;
        runValidation();
      });
    }
  });
})();
