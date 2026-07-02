import type { Request, Response } from "express";
import { clickService } from "../services/click.service";
import { linkService } from "../services/link.service";

export const redirectController = {
  async redirect(req: Request, res: Response) {
    const link = await linkService.findRedirectTarget(req.params.slug as string);

    res.redirect(302, link.urlOriginal);

    // Registro do clique não bloqueia a resposta — o visitante não deve
    // esperar a escrita no banco para ser redirecionado.
    const userAgent = req.headers["user-agent"];
    const referrer = req.headers.referer;
    clickService
      .register({
        linkId: link.id,
        ip: req.ip,
        userAgent: typeof userAgent === "string" ? userAgent : undefined,
        referrer: typeof referrer === "string" ? referrer : undefined,
      })
      .catch((err) => {
        console.error("Falha ao registrar clique:", err);
      });
  },
};
