'use client';

/**
 * 共通ハイライトコンポーネント。
 * text の中から query にマッチする部分を <mark> で包む。大小文字を無視。
 * 検索結果リスト、メンバー詳細画面の各フィールドで共通使用。
 */

interface Props {
  text: string | null | undefined;
  query?: string | null;
}

export default function Highlight({ text, query }: Props) {
  const t = text ?? '';
  if (!query || !t) return <>{t}</>;
  const safe = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${safe})`, 'gi');
  const parts = t.split(regex);
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={i}
            className="bg-yellow-200 text-black font-semibold rounded-sm px-0.5"
          >
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}
