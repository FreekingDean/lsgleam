import json


def run(text):
    m = None
    try:
        m = json.loads(text)
        ns = dict(globals())
        exec(m['code'], ns)
        return json.dumps({'id': m.get('id'), 'ok': True, 'result': ns.get('result')}, default=str)
    except Exception as e:
        return json.dumps({'id': m.get('id') if isinstance(m, dict) else None, 'ok': False, 'error': f'{type(e).__name__}: {e}'})


def onHTTPRequest(webServerDAT, request, response):
    body = request.get('data', '')
    if isinstance(body, bytes):
        body = body.decode()
    response['statusCode'] = 200
    response['statusReason'] = 'OK'
    response['Content-Type'] = 'application/json'
    response['Access-Control-Allow-Origin'] = '*'
    response['data'] = run(body) if request['method'] == 'POST' else '{"ok": true}'
    return response


def onWebSocketOpen(webServerDAT, client, uri):
    return


def onWebSocketClose(webServerDAT, client):
    return


def onWebSocketReceiveText(webServerDAT, client, data):
    webServerDAT.webSocketSendText(client, run(data))
    return


def onWebSocketReceiveBinary(webServerDAT, client, data):
    return


def onWebSocketReceivePing(webServerDAT, client, data):
    webServerDAT.webSocketSendPong(client, data=data)
    return


def onWebSocketReceivePong(webServerDAT, client, data):
    return


def onServerStart(webServerDAT):
    return


def onServerStop(webServerDAT):
    return
