function I(e, t) {
  return (
    console.log('IMPORTING Environment', e._id, e.name, JSON.stringify(e, null, 2)),
    {
      id: e._id,
      createdAt: new Date(e.created ?? Date.now()).toISOString().replace('Z', ''),
      updatedAt: new Date(e.updated ?? Date.now()).toISOString().replace('Z', ''),
      workspaceId: t,
      model: 'environment',
      name: e.name,
      variables: Object.entries(e.data).map(([n, s]) => ({
        enabled: !0,
        name: n,
        value: `${s}`,
      })),
    }
  );
}
function S(e) {
  return m(e) && e._type === 'workspace';
}
function O(e) {
  return m(e) && e._type === 'request_group';
}
function g(e) {
  return m(e) && e._type === 'request';
}
function f(e) {
  return m(e) && e._type === 'environment';
}
function m(e) {
  return Object.prototype.toString.call(e) === '[object Object]';
}
function y(e) {
  return Object.prototype.toString.call(e) === '[object String]';
}
function h(e) {
  return Object.entries(e).map(([t, n]) => ({
    enabled: !0,
    name: t,
    value: `${n}`,
  }));
}
function d(e) {
  return y(e) ? e.replaceAll(/{{\s*(_\.)?([^}]+)\s*}}/g, '${[$2]}') : e;
}
function _(e, t, n = 0) {
  var u, r;
  console.log('IMPORTING REQUEST', e._id, e.name, JSON.stringify(e, null, 2));
  let s = null,
    o = null;
  ((u = e.body) == null ? void 0 : u.mimeType) === 'application/graphql'
    ? ((s = 'graphql'), (o = d(e.body.text)))
    : ((r = e.body) == null ? void 0 : r.mimeType) === 'application/json' &&
      ((s = 'application/json'), (o = d(e.body.text)));
  let a = null,
    l = {};
  return (
    e.authentication.type === 'bearer'
      ? ((a = 'bearer'),
        (l = {
          token: d(e.authentication.token),
        }))
      : e.authentication.type === 'basic' &&
        ((a = 'basic'),
        (l = {
          username: d(e.authentication.username),
          password: d(e.authentication.password),
        })),
    {
      id: e._id,
      createdAt: new Date(e.created ?? Date.now()).toISOString().replace('Z', ''),
      updatedAt: new Date(e.updated ?? Date.now()).toISOString().replace('Z', ''),
      workspaceId: t,
      folderId: e.parentId === t ? null : e.parentId,
      model: 'http_request',
      sortPriority: n,
      name: e.name,
      url: d(e.url),
      body: o,
      bodyType: s,
      authentication: l,
      authenticationType: a,
      method: e.method,
      headers: (e.headers ?? [])
        .map(({ name: c, value: p, disabled: i }) => ({
          enabled: !i,
          name: c,
          value: p,
        }))
        .filter(({ name: c, value: p }) => c !== '' || p !== ''),
    }
  );
}
function N(e, t) {
  return (
    console.log('IMPORTING Workspace', e._id, e.name, JSON.stringify(e, null, 2)),
    {
      id: e._id,
      createdAt: new Date(e.created ?? Date.now()).toISOString().replace('Z', ''),
      updatedAt: new Date(e.updated ?? Date.now()).toISOString().replace('Z', ''),
      model: 'workspace',
      name: e.name,
      variables: t,
    }
  );
}
function D(e, t) {
  return (
    console.log('IMPORTING FOLDER', e._id, e.name, JSON.stringify(e, null, 2)),
    {
      id: e._id,
      createdAt: new Date(e.created ?? Date.now()).toISOString().replace('Z', ''),
      updatedAt: new Date(e.updated ?? Date.now()).toISOString().replace('Z', ''),
      folderId: e.parentId === t ? null : e.parentId,
      workspaceId: t,
      model: 'folder',
      name: e.name,
    }
  );
}
function w(e) {
  let t;
  try {
    t = JSON.parse(e);
  } catch {
    return;
  }
  if (!m(t) || !Array.isArray(t.requests)) return;
  const n = {
      workspaces: [],
      requests: [],
      environments: [],
      folders: [],
    },
    s = t.resources.filter(S);
  for (const o of s) {
    console.log('IMPORTING WORKSPACE', o.name);
    const a = t.resources.find((r) => f(r) && r.parentId === o._id);
    console.log('FOUND BASE ENV', a.name),
      n.workspaces.push(N(o, a ? h(a.data) : [])),
      console.log('IMPORTING ENVIRONMENTS', a.name);
    const l = t.resources.filter((r) => f(r) && r.parentId === (a == null ? void 0 : a._id));
    console.log('FOUND', l.length, 'ENVIRONMENTS'),
      n.environments.push(...l.map((r) => I(r, o._id)));
    const u = (r) => {
      const c = t.resources.filter((i) => i.parentId === r);
      let p = 0;
      for (const i of c)
        O(i) ? (n.folders.push(D(i, o._id)), u(i._id)) : g(i) && n.requests.push(_(i, o._id, p++));
    };
    u(o._id);
  }
  return (
    (n.requests = n.requests.filter(Boolean)),
    (n.environments = n.environments.filter(Boolean)),
    (n.workspaces = n.workspaces.filter(Boolean)),
    n
  );
}
export { w as pluginHookImport };
