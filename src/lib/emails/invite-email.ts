// ──────────────────────────────────────────────────────────────
// 招待メール本文 (HTML) を生成するヘルパー
//
// /api/invite/send から呼ばれてそのまま Resend に渡す。
// 文言はヒデさん家庭(非エンジニアの家族向け)用に やさしい日本語で。
// role で多少文言を変える(現状は文言ほぼ同じ、判定の余地のため引数は受ける)。
// ──────────────────────────────────────────────────────────────

export interface GenerateInviteEmailParams {
  /** 完全な招待 URL (例: https://houmon-app-lilac.vercel.app/invite/<token>) */
  inviteUrl: string;
  /** 'viewer'(閲覧のみ) or 'editor'(編集可) */
  role: 'viewer' | 'editor';
}

/** 招待メールの HTML 本文。Resend.emails.send({ html }) に渡す想定. */
export function generateInviteEmail({ inviteUrl, role }: GenerateInviteEmailParams): string {
  // role が editor の時だけ「一緒に編集できる」案内を補足。
  // viewer の場合は閲覧オンリーなのでシンプルに。
  const roleNote =
    role === 'editor'
      ? '訪問記録を 一緒に書き込みできます。'
      : '訪問記録を 見ることができます。';

  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #222;">
  <h2 style="font-size: 22px; margin: 0 0 20px; color: #111;">
    🏠 家庭訪問アプリ にご招待
  </h2>
  <p style="font-size: 16px; line-height: 1.8; margin: 0 0 24px;">
    こんにちは。<br>
    家庭訪問の記録を、一緒に見られるようにしました。<br>
    ${roleNote}<br>
    下のボタンから アプリに入ってください。
  </p>
  <p style="text-align: center; margin: 0 0 28px;">
    <a href="${inviteUrl}" style="display: inline-block; padding: 16px 36px; background: #111; color: #fff; text-decoration: none; border-radius: 28px; font-weight: bold; font-size: 16px;">
      アプリを開く
    </a>
  </p>
  <h3 style="font-size: 14px; margin: 0 0 8px; color: #555;">📝 入り方の手順</h3>
  <ol style="font-size: 14px; line-height: 1.8; color: #555; padding-left: 20px; margin: 0 0 28px;">
    <li>上の「アプリを開く」ボタンをタップ</li>
    <li>このメールアドレスを入力 →「コードを送信」を押す</li>
    <li>もう一通 メール (ログイン番号) が届きます</li>
    <li>その 6 桁の番号をアプリに入力</li>
    <li>完了！一緒の画面が見られます</li>
  </ol>
  <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 28px 0;">
  <p style="font-size: 12px; line-height: 1.7; color: #888; margin: 0;">
    🔒 このリンクは <strong>30 日間</strong> 有効です。<br>
    🤔 心当たりがない場合はこのメールを無視してください。<br>
    開かない限り何も登録されません。
  </p>
</div>`;
}
