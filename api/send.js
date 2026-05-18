const nodemailer = require("nodemailer");

function limpar(valor) {
  if (Array.isArray(valor)) return valor.map(limpar).filter(Boolean);
  return String(valor || "").trim();
}

function escaparHtml(valor) {
  return String(valor || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function linha(rotulo, valor) {
  const texto = Array.isArray(valor) ? valor.join(", ") : valor;
  const seguro = escaparHtml(texto || "Não informado");
  return `<tr>
    <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-weight:700;color:#10233f;width:190px;">${rotulo}</td>
    <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#334155;">${seguro}</td>
  </tr>`;
}

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const dados = req.body || {};

    // Honeypot anti-spam: se esse campo vier preenchido, não envia e não acusa erro no site.
    if (limpar(dados._honey)) {
      return res.status(200).json({ success: true });
    }

    const nome = limpar(dados.nome);
    const telefone = limpar(dados.telefone);
    const email = limpar(dados.email);
    const cidade = limpar(dados.cidade);
    const metragem = limpar(dados.metragem_aproximada);
    const servicos = limpar(dados.servicos);
    const mensagem = limpar(dados.mensagem);

    if (!nome || !telefone) {
      return res.status(400).json({ error: "Nome e telefone são obrigatórios." });
    }

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error("Variáveis EMAIL_USER ou EMAIL_PASS não configuradas.");
      return res.status(500).json({ error: "Configuração de e-mail incompleta." });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const agora = new Date().toLocaleString("pt-BR", {
      timeZone: "America/Bahia",
      dateStyle: "short",
      timeStyle: "short",
    });

    const html = `
      <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;">
        <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden;">
          <div style="background:#10233f;color:#ffffff;padding:22px 24px;">
            <h2 style="margin:0;font-size:22px;">Nova solicitação de orçamento</h2>
            <p style="margin:8px 0 0;color:#dbeafe;">JM Neto Engenharia • ${escaparHtml(agora)}</p>
          </div>

          <table style="width:100%;border-collapse:collapse;">
            ${linha("Nome", nome)}
            ${linha("Telefone", telefone)}
            ${linha("E-mail", email)}
            ${linha("Cidade / Estado", cidade)}
            ${linha("Metragem aproximada", metragem)}
            ${linha("Tipo de projeto", servicos)}
          </table>

          <div style="padding:18px 24px;">
            <h3 style="margin:0 0 10px;color:#10233f;">Mensagem</h3>
            <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:14px;padding:14px;color:#334155;line-height:1.55;white-space:pre-wrap;">${escaparHtml(mensagem || "Não informado")}</div>
          </div>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"Site JM Neto Engenharia" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      replyTo: email || process.env.EMAIL_USER,
      subject: "Nova solicitação de orçamento - JM Neto Engenharia",
      html,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Erro ao enviar solicitação:", error);
    return res.status(500).json({ error: "Erro ao enviar e-mail" });
  }
};
