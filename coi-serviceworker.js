/*! coi-serviceworker v0.1.7 - Guido Zuidhof and contributors, licensed under MIT */
let coepCredentialless = true;
if (typeof window === 'undefined') {
    self.addEventListener("install", () => self.skipWaiting());
    self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

    self.addEventListener("message", (ev) => {
        if (!ev.data) {
            return;
        } else if (ev.data.type === "deregister") {
            self.registration
                .unregister()
                .then(() => {
                    return self.clients.matchAll();
                })
                .then(clients => {
                    clients.forEach((client) => client.navigate(client.url));
                });
        } else if (ev.data.type === "coepCredentialless") {
            coepCredentialless = ev.data.value;
        }
    });

    self.addEventListener("fetch", function (event) {
        const r = event.request;
        if (r.cache === "only-if-cached" && r.mode !== "same-origin") {
            return;
        }

        const request = (coepCredentialless && r.mode === "no-cors")
            ? new Request(r, { credentials: "omit" })
            : r;

        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response.status === 0) {
                        return response;
                    }

                    const newHeaders = new Headers(response.headers);
                    newHeaders.set("Cross-Origin-Embedder-Policy",
                        coepCredentialless ? "credentialless" : "require-corp"
                    );
                    if (!coepCredentialless) {
                        newHeaders.set("Cross-Origin-Resource-Policy", "cross-origin");
                    }
                    newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");

                    return new Response(
                        [204, 205, 304].includes(response.status) ? null : response.body,
                        {
                            status: response.status,
                            statusText: response.statusText,
                            headers: newHeaders,
                        }
                    );
                })
                .catch((e) => console.error(e))
        );
    });
} else {
    (() => {
        const reloadedBySelf = window.sessionStorage.getItem("coiReloadedBySelf");
        window.sessionStorage.removeItem("coiReloadedBySelf");

        const coi = {
            shouldRegister: () => !reloadedBySelf,
            shouldDeregister: () => false,
            coepCredentialless: () => true,
            coepDegrade: () => true,
            doReload: () => window.location.reload(),
            quiet: false,
            ...window.coi
        };

        const n = navigator;
        if (coi.shouldDeregister() && n.serviceWorker && n.serviceWorker.controller) {
            n.serviceWorker.controller.postMessage({ type: "deregister" });
        }

        if (window.crossOriginIsolated) return;

        if (!coi.shouldRegister()) return;

        if (!window.isSecureContext) {
            !coi.quiet && console.log("COI Service Worker: Not in a secure context, cannot register.");
            return;
        }

        if (n.serviceWorker) {
            n.serviceWorker.register(window.document.currentScript.src).then(
                (registration) => {
                    !coi.quiet && console.log("COI Service Worker registered with scope: ", registration.scope);

                    registration.addEventListener("updatefound", () => {
                        !coi.quiet && console.log("COI Service Worker updated; reloading...");
                        coi.doReload();
                    });

                    if (registration.active && !n.serviceWorker.controller) {
                        !coi.quiet && console.log("COI Service Worker active; reloading...");
                        coi.doReload();
                    }
                },
                (err) => {
                    !coi.quiet && console.error("COI Service Worker registration failed: ", err);
                }
            );

            n.serviceWorker.addEventListener("message", (ev) => {
                if (ev.data && ev.data.type === "reload") {
                    coi.doReload();
                }
            });

            if (n.serviceWorker.controller) {
                n.serviceWorker.controller.postMessage({
                    type: "coepCredentialless",
                    value: coi.coepCredentialless()
                });
            }
        }
    })();
}
