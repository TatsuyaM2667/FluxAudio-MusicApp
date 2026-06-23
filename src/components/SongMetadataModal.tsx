import { useEffect, useState } from 'react';
import { SongMeta } from '../types/music';
import { IconX } from './Icons';
import { SongMetadataUpdate } from '../api';

type SongMetadataModalProps = {
    song: SongMeta | null;
    saving: boolean;
    onClose: () => void;
    onSave: (song: SongMeta, updates: SongMetadataUpdate) => Promise<void>;
};

export function SongMetadataModal({ song, saving, onClose, onSave }: SongMetadataModalProps) {
    const [form, setForm] = useState<SongMetadataUpdate>({});

    useEffect(() => {
        if (!song) return;
        setForm({
            title: song.tags?.title || '',
            artist: song.tags?.artist || '',
            album: song.tags?.album || '',
            year: song.tags?.year || '',
            genre: song.tags?.genre || ''
        });
    }, [song]);

    if (!song) return null;

    const updateField = (field: keyof SongMetadataUpdate, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
        >
            <form
                className="bg-[#1c1c1e] text-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-white/10"
                onClick={e => e.stopPropagation()}
                onSubmit={async e => {
                    e.preventDefault();
                    await onSave(song, form);
                }}
            >
                <div className="p-4 border-b border-white/10 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-lg">タグを編集</h3>
                        <p className="text-xs text-gray-400 truncate max-w-[20rem]">{song.path}</p>
                    </div>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-white">
                        <IconX size={24} />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {[
                        ['title', 'タイトル'],
                        ['artist', 'アーティスト'],
                        ['album', 'アルバム'],
                        ['year', '年'],
                        ['genre', 'ジャンル']
                    ].map(([field, label]) => (
                        <label key={field} className="block">
                            <span className="block text-sm font-medium text-gray-300 mb-1">{label}</span>
                            <input
                                value={(form[field as keyof SongMetadataUpdate] || '') as string}
                                onChange={e => updateField(field as keyof SongMetadataUpdate, e.target.value)}
                                className="w-full bg-[#2c2c2e] border border-white/10 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-500"
                            />
                        </label>
                    ))}
                </div>

                <div className="p-4 border-t border-white/10 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 transition"
                    >
                        キャンセル
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 transition font-bold"
                    >
                        {saving ? '保存中...' : '保存'}
                    </button>
                </div>
            </form>
        </div>
    );
}
