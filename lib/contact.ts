/**
 * 五合一全渠道联系方式
 * 优先从后台 site_settings 读取（getContactChannelsFromSettings），未配置时从环境变量读取（getContactChannels）。
 *
 * 环境变量（兜底）：
 * - NEXT_PUBLIC_WHATSAPP_NUMBER  如 8613800138000（国际格式无+）
 * - NEXT_PUBLIC_LINE              Line 客服链接（完整 URL）
 * - NEXT_PUBLIC_TELEGRAM          Telegram 用户名或 t.me/xxx 链接
 * - NEXT_PUBLIC_INSTAGRAM_HANDLE  Instagram 用户名（可带 @）
 * - NEXT_PUBLIC_WECHAT_ID         微信号（用于一键复制）
 *
 * 后台 site_settings 的 key（与客服渠道表单一致）：
 * - contact_whatsapp_number  contact_line_link  contact_telegram
 * - contact_instagram_handle  contact_facebook_link  contact_wechat_id
 */

const ORDER_MESSAGE = (orderLabel: string) =>
  `您好，我想咨询订单 ${orderLabel} 的详细情况。`;

export type ContactChannelId = "whatsapp" | "line" | "telegram" | "instagram" | "wechat";

export type ContactContext = {
  orderId: string;
  trackingNumber?: string | null;
};

/** 展示用订单标签 */
export function getOrderLabel(ctx: ContactContext): string {
  if (ctx?.trackingNumber?.trim()) return ctx.trackingNumber.trim();
  const year = new Date().getFullYear();
  const short = (ctx?.orderId ?? "").replace(/-/g, "").slice(0, 6).toUpperCase();
  return `LOG${year}${short}`;
}

/** 除微信外使用的咨询文案 */
export function getOrderConsultMessage(ctx: ContactContext | null): string {
  if (!ctx) return "您好，我想咨询物流与下单问题。";
  return ORDER_MESSAGE(getOrderLabel(ctx));
}

/** WhatsApp: wa.me/<number>?text= */
function getWhatsAppConfig(): { href: string; message: string } | null {
  const raw = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  if (!raw?.trim()) return null;
  const num = raw.replace(/\D/g, "");
  if (!num) return null;
  return {
    href: `https://wa.me/${num}`,
    message: getOrderConsultMessage(null),
  };
}

/** Line: 直接打开配置的链接，可带文案则通过 URL 参数（视 Line 链接格式而定，此处用 query） */
function getLineConfig(): { href: string; message: string } | null {
  const url = process.env.NEXT_PUBLIC_LINE;
  if (!url?.trim()) return null;
  return { href: url.trim(), message: getOrderConsultMessage(null) };
}

/** Telegram: t.me/<bot_or_username>?text= 或 先打开对话再预填（部分客户端支持 start 参数） */
function getTelegramConfig(): { href: string; message: string } | null {
  const raw = process.env.NEXT_PUBLIC_TELEGRAM;
  if (!raw?.trim()) return null;
  const handle = raw.replace(/^https?:\/\/t\.me\/?/i, "").replace(/^@/, "").split("?")[0];
  if (!handle) return null;
  return {
    href: `https://t.me/${handle}`,
    message: getOrderConsultMessage(null),
  };
}

/** Instagram: 个人主页，无法预填 DM 文案 */
function getInstagramConfig(): { href: string } | null {
  const handle = process.env.NEXT_PUBLIC_INSTAGRAM_HANDLE;
  if (!handle?.trim()) return null;
  const user = handle.replace(/^@/, "").trim();
  return { href: `https://www.instagram.com/${user}/` };
}

/** 微信: 仅用于复制微信号 */
function getWeChatConfig(): { wechatId: string } | null {
  const id = process.env.NEXT_PUBLIC_WECHAT_ID;
  if (!id?.trim()) return null;
  return { wechatId: id.trim() };
}

export type ContactChannelOption = {
  id: ContactChannelId;
  label: string;
  /** 品牌主色，用于按钮背景或边框 */
  color: string;
  /** 点击行为: 'open' 打开 href；'copy' 复制并提示（微信） */
  action: "open" | "copy";
  href?: string;
  /** 打开链接时附带文案（用于 wa.me?text=、t.me 等） */
  message?: string;
  wechatId?: string;
};

/**
 * 返回已配置的渠道列表；传入 ctx 时自动填充订单咨询文案。
 * 未配置的渠道不返回，前端不展示空白位。
 */
export function getContactChannels(ctx: ContactContext | null): ContactChannelOption[] {
  const message = getOrderConsultMessage(ctx);
  const list: ContactChannelOption[] = [];

  const whatsapp = getWhatsAppConfig();
  if (whatsapp) {
    list.push({
      id: "whatsapp",
      label: "WhatsApp",
      color: "#25D366",
      action: "open",
      href: `${whatsapp.href}?text=${encodeURIComponent(message)}`,
    });
  }

  const line = getLineConfig();
  if (line) {
    const separator = line.href.includes("?") ? "&" : "?";
    list.push({
      id: "line",
      label: "Line",
      color: "#00B900",
      action: "open",
      href: `${line.href}${separator}text=${encodeURIComponent(message)}`,
      message,
    });
  }

  const telegram = getTelegramConfig();
  if (telegram) {
    list.push({
      id: "telegram",
      label: "Telegram",
      color: "#0088CC",
      action: "open",
      href: telegram.href,
      message,
    });
  }

  const instagram = getInstagramConfig();
  if (instagram) {
    list.push({
      id: "instagram",
      label: "Instagram",
      color: "#E4405F",
      action: "open",
      href: instagram.href,
    });
  }

  const wechat = getWeChatConfig();
  if (wechat) {
    list.push({
      id: "wechat",
      label: "微信",
      color: "#07C160",
      action: "copy",
      wechatId: wechat.wechatId,
    });
  }

  return list;
}

/** 从 site_settings 键值生成渠道列表；未配置的 key 不返回该渠道。 */
export function getContactChannelsFromSettings(
  settings: Record<string, string | null | undefined>,
  ctx: ContactContext | null = null
): ContactChannelOption[] {
  const message = getOrderConsultMessage(ctx);
  const list: ContactChannelOption[] = [];
  const get = (key: string) => (settings[key] ?? "").trim();

  const whatsappNum = get("contact_whatsapp_number");
  if (whatsappNum) {
    const num = whatsappNum.replace(/\D/g, "");
    if (num) {
      list.push({
        id: "whatsapp",
        label: "WhatsApp",
        color: "#25D366",
        action: "open",
        href: `https://wa.me/${num}?text=${encodeURIComponent(message)}`,
      });
    }
  }

  const lineUrl = get("contact_line_link");
  if (lineUrl) {
    const separator = lineUrl.includes("?") ? "&" : "?";
    list.push({
      id: "line",
      label: "Line",
      color: "#00B900",
      action: "open",
      href: `${lineUrl}${separator}text=${encodeURIComponent(message)}`,
      message,
    });
  }

  const telegramRaw = get("contact_telegram");
  if (telegramRaw) {
    const handle = telegramRaw.replace(/^https?:\/\/t\.me\/?/i, "").replace(/^@/, "").split("?")[0];
    if (handle) {
      list.push({
        id: "telegram",
        label: "Telegram",
        color: "#0088CC",
        action: "open",
        href: `https://t.me/${handle}`,
        message,
      });
    }
  }

  const igHandle = get("contact_instagram_handle");
  if (igHandle) {
    const user = igHandle.replace(/^@/, "");
    list.push({
      id: "instagram",
      label: "Instagram",
      color: "#E4405F",
      action: "open",
      href: `https://www.instagram.com/${user}/`,
    });
  }

  const wechatId = get("contact_wechat_id");
  if (wechatId) {
    list.push({
      id: "wechat",
      label: "微信",
      color: "#07C160",
      action: "copy",
      wechatId,
    });
  }

  return list;
}