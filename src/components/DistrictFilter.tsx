'use client';

interface Props {
  selected: string | null;
  onChange: (district: string | null) => void;
}

const DISTRICTS: { key: string; short: string }[] = [
  { key: '豊岡部英雄地区', short: '英雄' },
  { key: '豊岡部香城地区', short: '香城' },
  { key: '豊岡部正義地区', short: '正義' },
  { key: '光陽部光陽地区', short: '光陽' },
  { key: '光陽部光輝地区', short: '光輝' },
  { key: '光陽部黄金地区', short: '黄金' },
  { key: '豊岡中央支部歓喜地区', short: '歓喜' },
  { key: '豊岡中央支部ナポレオン地区', short: 'ナポレオン' },
  { key: '豊岡中央支部幸福地区', short: '幸福' },
];

export default function DistrictFilter({ selected, onChange }: Props) {
  return (
    <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
      <button
        onClick={() => onChange(null)}
        className={`chip whitespace-nowrap ${selected === null ? 'selected' : ''}`}
      >
        すべて
      </button>
      {DISTRICTS.map(({ key, short }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`chip whitespace-nowrap ${selected === key ? 'selected' : ''}`}
        >
          {short}
        </button>
      ))}
    </div>
  );
}
