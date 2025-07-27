// Universal iOS SSL Pinning Bypass and Network Monitor v3.0 (Mejorado)
// Autor: missaels235 (https://github.com/missaels235)
(function() {
    'use strict';
    const COLORS = {
        green: "\x1b[32m", yellow: "\x1b[33m", red: "\x1b[31m",
        cyan: "\x1b[36m", magenta: "\x1b[35m", blue: "\x1b[34m", reset: "\x1b[0m"
    };
    const responseData = {};
    function formatData(data) {
        if (!data || data.isNull()) return "Nada enviado/recibido";
        try {
            const nsData = new ObjC.Object(data);
            const str = nsData.bytes().readUtf8String(nsData.length());
            if (str) return str;
        } catch (e) {}
        return `Datos binarios (longitud: ${new ObjC.Object(data).length()})`;
    }
    function bypassAntiTampering() {
        ['ptrace','exit','abort','kill'].forEach(name => {
            try {
                const ptr = Module.findExportByName(null, name);
                if (ptr) Interceptor.replace(ptr, new NativeCallback(() => 0, 'int', []));
            } catch (e) {}
        });
    }
    function bypassSSLPinning() {
        console.log(`${COLORS.yellow}[*] Anulando anclaje SSL...${COLORS.reset}`);
        try {
            const ste = Module.findExportByName("Security", "SecTrustEvaluate");
            if (ste) Interceptor.attach(ste, { onLeave: r => r.replace(1) });
        } catch(e){}
        try {
            const stewe = Module.findExportByName("Security", "SecTrustEvaluateWithError");
            if (stewe) Interceptor.attach(stewe, { onLeave: r => r.replace(1) });
        } catch(e){}
        try {
            const sel = ObjC.selector('URLSession:didReceiveChallenge:completionHandler:');
            const impl = ObjC.classes.NSObject[sel].implementation;
            Interceptor.attach(impl, {
                onEnter(args) {
                    const ch = new ObjC.Object(args[2]);
                    if (ch.protectionSpace().authenticationMethod().toString() === "NSURLAuthenticationMethodServerTrust") {
                        new ObjC.Block(args[3]).implementation(2, ptr(0));
                    }
                }
            });
        } catch(e){}
    }
    function hookNetworkActivity() {
        console.log(`${COLORS.cyan}[*] Monitoreando red...${COLORS.reset}`);
        ['- dataTaskWithRequest:','- dataTaskWithRequest:completionHandler:'].forEach(name => {
            try {
                const m = ObjC.classes.NSURLSession[name];
                Interceptor.attach(m.implementation, {
                    onEnter(args) {
                        const req = new ObjC.Object(args[2]);
                        const url = req.URL().toString(), method = req.HTTPMethod().toString();
                        console.log(`\n${COLORS.yellow}[REQUEST] ${method} ${url}${COLORS.reset}`);
                        const hdr = req.allHTTPHeaderFields();
                        if (hdr) console.log(`  ${COLORS.cyan}HEADERS: ${hdr.toString()}${COLORS.reset}`);
                        const body = req.HTTPBody();
                        if (body) console.log(`  ${COLORS.magenta}BODY: ${formatData(body)}${COLORS.reset}`);
                        if (name.includes('completionHandler')) {
                            const cb = new ObjC.Block(args[3]), orig = cb.implementation;
                            cb.implementation = function(data, response, error) {
                                console.log(`${COLORS.green}[RESPONSE] ${url}${COLORS.reset}`);
                                if (!error || error.isNull()) {
                                    const res = new ObjC.Object(response);
                                    console.log(`  ${COLORS.green}STATUS: ${res.statusCode()}${COLORS.reset}`);
                                    if (data) console.log(`  ${COLORS.green}BODY: ${formatData(data)}${COLORS.reset}`);
                                } else {
                                    console.log(`  ${COLORS.red}ERROR: ${new ObjC.Object(error).localizedDescription()}${COLORS.reset}`);
                                }
                                orig(data, response, error);
                            };
                        }
                    }
                });
            } catch(e){}
        });
        // Delegates y legacy…
        try {
            const respSel = ObjC.selector('URLSession:dataTask:didReceiveResponse:completionHandler:');
            const dataSel = ObjC.selector('URLSession:dataTask:didReceiveData:');
            const compSel = ObjC.selector('URLSession:task:didCompleteWithError:');
            Interceptor.attach(ObjC.classes.NSObject[respSel].implementation, {
                onEnter(args) {
                    const r = new ObjC.Object(args[4]);
                    console.log(`${COLORS.blue}[DELEGATE] STATUS: ${r.statusCode()}${COLORS.reset}`);
                    new ObjC.Block(args[5]).implementation(1);
                }
            });
            Interceptor.attach(ObjC.classes.NSObject[dataSel].implementation, {
                onEnter(args) {
                    const id = new ObjC.Object(args[3]).taskIdentifier().toString();
                    const d = new ObjC.Object(args[4]);
                    if (!responseData[id]) responseData[id] = ObjC.classes.NSMutableData.alloc().init();
                    responseData[id].appendData_(d);
                }
            });
            Interceptor.attach(ObjC.classes.NSObject[compSel].implementation, {
                onEnter(args) {
                    const id = new ObjC.Object(args[3]).taskIdentifier().toString();
                    const err = args[4];
                    if (!err || err.isNull()) {
                        const d = responseData[id];
                        if (d) console.log(`${COLORS.blue}DELEGATE BODY: ${formatData(d)}${COLORS.reset}`);
                    } else {
                        console.log(`${COLORS.red}DELEGATE ERROR: ${new ObjC.Object(err).localizedDescription()}${COLORS.reset}`);
                    }
                    delete responseData[id];
                }
            });
        } catch(e){}
        try {
            const legacy = ObjC.classes.NSURLConnection['+ connectionWithRequest:delegate:'];
            Interceptor.attach(legacy.implementation, {
                onEnter(args) {
                    const r = new ObjC.Object(args[2]);
                    console.log(`\n${COLORS.cyan}[LEGACY] ${r.HTTPMethod()} ${r.URL().toString()}${COLORS.reset}`);
                }
            });
        } catch(e){}
        try {
            const wk = ObjC.classes.WKWebView['- loadRequest:'];
            Interceptor.attach(wk.implementation, {
                onEnter(args) {
                    const r = new ObjC.Object(args[2]);
                    console.log(`\n${COLORS.magenta}[WEBVIEW] ${r.HTTPMethod()} ${r.URL().toString()}${COLORS.reset}`);
                }
            });
        } catch(e){}
    }
    if (ObjC.available) {
        ObjC.schedule(ObjC.mainQueue, () => {
            console.log(`${COLORS.green}[*] v3.0 iniciado…${COLORS.reset}`);
            bypassAntiTampering();
            bypassSSLPinning();
            hookNetworkActivity();
            console.log(`${COLORS.green}[✓] Listo. Esperando tráfico...${COLORS.reset}`);
        });
    } else {
        console.log(`${COLORS.red}[!] ObjC no disponible. Solo iOS.${COLORS.reset}`);
    }
})();
