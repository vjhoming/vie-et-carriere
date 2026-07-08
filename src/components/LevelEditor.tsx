import React, { useState, useEffect, useRef } from 'react';
import { LevelSection, LevelItem, getLevelData, saveLevelData, DEFAULT_LEVEL_DATA, getGameMessagesConfig, saveGameMessagesConfig, DEFAULT_GAME_MESSAGES, GameMessagesConfig, resetToDefault } from '../levelData';
import { X, Save, RotateCcw, Clipboard, Download, Upload } from 'lucide-react';
import GlobalTimelineEditor from './GlobalTimelineEditor';

interface LevelEditorProps {
    onClose: () => void;
    onSave?: () => void;
}

export default function LevelEditor({ onClose, onSave }: LevelEditorProps) {
    const [activeTab, setActiveTab] = useState<'global' | 'levels' | 'json'>('global');
    const [data, setData] = useState<LevelSection[]>(getLevelData);
    const [messagesData, setMessagesData] = useState<GameMessagesConfig>(getGameMessagesConfig);
    const [jsonString, setJsonString] = useState('');
    const [jsonError, setJsonError] = useState<string | null>(null);

    // Update JSON text when entering tab
    useEffect(() => {
        if (activeTab === 'json') {
            try {
                setJsonString(JSON.stringify(data, null, 2));
                setJsonError(null);
            } catch (e: any) {
                setJsonError("Erreur de génération JSON: " + e.message);
            }
        }
    }, [activeTab, data]);

    const handleSave = () => {
        saveLevelData(data);
        saveGameMessagesConfig(messagesData);
        onClose();
        if (onSave) {
            onSave();
        } else {
            window.location.reload();
        }
    };

    const handleReset = () => {
        if (confirm('Voulez-vous vraiment réinitialiser les données par défaut ?')) {
            resetToDefault();
            window.location.reload();
        }
    };

    const updateItemOffset = (sectionIndex: number, itemIndex: number, newOffset: number) => {
        const newData = [...data];
        // Ensure offset stays within bounds
        const maxLength = newData[sectionIndex].length;
        const boundedOffset = Math.max(0, Math.min(newOffset, maxLength));
        
        newData[sectionIndex].items[itemIndex].zOffset = Math.floor(boundedOffset);
        setData(newData);
    };

    return (
        <div className="absolute inset-0 z-50 bg-gray-900 bg-opacity-95 text-white flex flex-col p-4 font-sans overflow-hidden">
            <div className="flex justify-between items-center mb-4 bg-gray-800 p-4 rounded shadow-lg">
                <div className="flex gap-4 items-center">
                    <h1 className="text-xl font-bold text-yellow-400">Éditeur</h1>
                    <div className="flex gap-2 bg-gray-900 p-1 rounded-lg">
                        <button 
                            onClick={() => setActiveTab('global')}
                            className={`px-4 py-1 text-sm font-bold rounded ${activeTab === 'global' ? 'bg-yellow-400 text-black' : 'text-gray-400 hover:text-white'}`}
                        >
                            Éditeur Global
                        </button>
                        <button 
                            onClick={() => setActiveTab('levels')}
                            className={`px-4 py-1 text-sm font-bold rounded ${activeTab === 'levels' ? 'bg-yellow-400 text-black' : 'text-gray-400 hover:text-white'}`}
                        >
                            Structure du Niveau
                        </button>
                        <button 
                            onClick={() => setActiveTab('json')}
                            className={`px-4 py-1 text-sm font-bold rounded ${activeTab === 'json' ? 'bg-yellow-400 text-black' : 'text-gray-400 hover:text-white'}`}
                        >
                            Fichier Maître JSON
                        </button>
                    </div>
                </div>
                <div className="flex gap-4">
                    <button onClick={handleReset} className="flex items-center gap-2 bg-red-600 hover:bg-red-500 px-4 py-2 rounded font-bold text-sm transition-colors">
                        <RotateCcw size={16} /> Réinitialiser
                    </button>
                    <button onClick={handleSave} className="flex items-center gap-2 bg-green-600 hover:bg-green-500 px-4 py-2 rounded font-bold text-sm transition-colors">
                        <Save size={16} /> Sauvegarder & Quitter
                    </button>
                    <button onClick={onClose} className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors">
                        <X size={20} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                {activeTab === 'global' && (
                    <GlobalTimelineEditor 
                        data={data} 
                        setData={setData} 
                        messagesData={messagesData}
                        setMessagesData={setMessagesData}
                    />
                )}

                {activeTab === 'levels' && data.map((section, sIndex) => (
                    <SectionEditor 
                        key={section.id} 
                        section={section}
                        onItemMove={(iIndex, newOffset) => updateItemOffset(sIndex, iIndex, newOffset)}
                        onLengthChange={(newLength) => {
                            const newData = data.map(s => ({ ...s, items: s.items.map(i => ({...i})), messages: (s.messages || []).map(m => ({...m})) }));
                            newData[sIndex].length = newLength;
                            setData(newData);
                        }}
                        onItemUpdate={(iIndex, field, value) => {
                            const newData = data.map(s => ({ ...s, items: s.items.map(i => ({...i})), messages: (s.messages || []).map(m => ({...m})) }));
                            newData[sIndex].items[iIndex] = {
                                ...newData[sIndex].items[iIndex],
                                [field]: value
                            };
                            setData(newData);
                        }}
                        onMessageUpdate={(mIndex, field, value) => {
                            const newData = data.map(s => ({ ...s, items: s.items.map(i => ({...i})), messages: (s.messages || []).map(m => ({...m})) }));
                            newData[sIndex].messages[mIndex] = {
                                ...newData[sIndex].messages[mIndex],
                                [field]: value
                            };
                            setData(newData);
                        }}
                        onMessageAdd={() => {
                            const newData = data.map(s => ({ ...s, items: s.items.map(i => ({...i})), messages: (s.messages || []).map(m => ({...m})) }));
                            if (!newData[sIndex].messages) {
                                newData[sIndex].messages = [];
                            }
                            newData[sIndex].messages.push({
                                text: "Nouveau message",
                                startOffset: 0,
                                endOffset: Math.min(2000, newData[sIndex].length)
                            });
                            setData(newData);
                        }}
                        onMessageDelete={(mIndex) => {
                            const newData = data.map(s => ({ ...s, items: s.items.map(i => ({...i})), messages: (s.messages || []).map(m => ({...m})) }));
                            newData[sIndex].messages.splice(mIndex, 1);
                            setData(newData);
                        }}
                    />
                ))}

                {activeTab === 'json' && (
                    <div className="bg-gray-800 p-6 rounded-lg shadow-md border border-gray-700 space-y-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h2 className="text-xl font-bold text-yellow-300">Édition Horizontale par Fichier Maître (JSON)</h2>
                                <p className="text-sm text-gray-400 mt-1">
                                    Chaque colonne correspond à un intervalle de <strong>100 mètres (unités Z)</strong> sur la chronologie. Vous pouvez copier, éditer ou téléverser votre fichier maître.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button 
                                    onClick={() => {
                                        navigator.clipboard.writeText(jsonString);
                                        alert("JSON copié dans le presse-papiers !");
                                    }}
                                    className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors"
                                >
                                    <Clipboard size={14} /> Copier
                                </button>
                                <button 
                                    onClick={() => {
                                        const blob = new Blob([jsonString], { type: 'text/json;charset=utf-8;' });
                                        const url = URL.createObjectURL(blob);
                                        const link = document.createElement('a');
                                        link.href = url;
                                        link.setAttribute('download', 'levelData.json');
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                    }}
                                    className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors"
                                >
                                    <Download size={14} /> Télécharger (.json)
                                </button>
                                <label className="flex items-center gap-1 bg-teal-600 hover:bg-teal-500 text-white px-3 py-1.5 rounded text-xs font-bold cursor-pointer transition-colors">
                                    <Upload size={14} /> Importer un fichier
                                    <input 
                                        type="file" 
                                        accept=".json" 
                                        className="hidden" 
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onload = (evt) => {
                                                    const text = evt.target?.result as string;
                                                    if (text) {
                                                        setJsonString(text);
                                                        try {
                                                            const parsed = JSON.parse(text);
                                                            setData(parsed);
                                                            setJsonError(null);
                                                            alert("Fichier JSON chargé avec succès ! N'oubliez pas de sauvegarder.");
                                                        } catch (err: any) {
                                                            setJsonError("Erreur d'import : " + err.message);
                                                        }
                                                    }
                                                };
                                                reader.readAsText(file, 'UTF-8');
                                            }
                                        }}
                                    />
                                </label>
                            </div>
                        </div>

                        {jsonError && (
                            <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded text-sm font-mono whitespace-pre-wrap">
                                ⚠️ {jsonError}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-300 block">Contenu brut du fichier JSON (UTF-8) :</label>
                            <textarea 
                                className="w-full h-80 bg-gray-950 text-green-400 p-4 rounded border border-gray-700 font-mono text-xs focus:border-yellow-400 outline-none resize-y whitespace-pre overflow-x-auto"
                                value={jsonString}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setJsonString(val);
                                    try {
                                        const parsed = JSON.parse(val);
                                        setData(parsed);
                                        setJsonError(null);
                                    } catch (err: any) {
                                        setJsonError(err.message);
                                    }
                                }}
                            />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
                            <div className="bg-gray-950 p-4 rounded-lg border border-gray-800 space-y-2">
                                <h3 className="font-bold text-yellow-300 text-sm">📘 Guide du Format des Lignes</h3>
                                <ul className="space-y-2 text-gray-400">
                                    <li>
                                        <strong className="text-white">Ligne 1 (Distance) :</strong> 0, 100, 200, 300, etc. (incréments de 100).
                                    </li>
                                    <li>
                                        <strong className="text-white">Ligne 2 (Environment) :</strong> Débuts et fins de sections :
                                        <br />• <code className="text-green-400 bg-gray-900 px-1 rounded">START:id:nom:type[:ecoleType:color]</code>
                                        <br />• <code className="text-green-400 bg-gray-900 px-1 rounded">END:nom</code>
                                        <br /><span className="text-[10px] text-gray-500">Exemple: START:2:École Primaire:ecole:primaire:0xd32f2f</span>
                                    </li>
                                    <li>
                                        <strong className="text-white">Ligne 3 (Obstacles) :</strong> Séparés par des points-virgules <code className="text-yellow-400 font-bold">;</code> :
                                        <br />• <code className="text-green-400 bg-gray-900 px-1 rounded">type(x=0,y=150,grade=A+,pts=100 pts,dialogue="Aïe !")</code>
                                        <br /><span className="text-[10px] text-gray-500">Exemple: bulletin(x=0,y=150,grade=A+,pts=100 pts);bonnet</span>
                                    </li>
                                    <li>
                                        <strong className="text-white">Ligne 4 (Messages de Zone) :</strong> Détermine les zones de dialogues :
                                        <br />• <code className="text-green-400 bg-gray-900 px-1 rounded">START:"La petite porte..."</code> et <code className="text-green-400 bg-gray-900 px-1 rounded">END:"La petite porte..."</code>
                                    </li>
                                </ul>
                            </div>

                            <div className="bg-gray-950 p-4 rounded-lg border border-gray-800 space-y-2">
                                <h3 className="font-bold text-yellow-300 text-sm">🚀 Types d'Obstacles et de Personnages Supportés</h3>
                                <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-400">
                                    <div>
                                        <span className="text-white font-bold">Obstacles & Items :</span>
                                        <ul className="list-disc list-inside space-y-0.5 mt-1">
                                            <li><code className="text-orange-300">bonnet</code> - Bonnet d'âne</li>
                                            <li><code className="text-orange-300">bulletin</code> - Bulletin scolaire</li>
                                            <li><code className="text-orange-300">biere</code> - Bière</li>
                                            <li><code className="text-orange-300">seringue</code> - Seringue</li>
                                            <li><code className="text-orange-300">condon</code> - Condom protecteur</li>
                                            <li><code className="text-orange-300">gars</code> - Gars (bébé si pas de condom)</li>
                                        </ul>
                                    </div>
                                    <div>
                                        <span className="text-white font-bold">Personnages & Lieux :</span>
                                        <ul className="list-disc list-inside space-y-0.5 mt-1">
                                            <li><code className="text-orange-300">bourse</code> - Bourse d'études</li>
                                            <li><code className="text-orange-300">pere</code> - Papa d'Isabelle</li>
                                            <li><code className="text-orange-300">guichet</code> - Guichet automatique</li>
                                            <li><code className="text-orange-300">police</code> - Policier</li>
                                            <li><code className="text-orange-300">bac</code> - Diplôme de graduation</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

interface SectionEditorProps {
    key?: React.Key;
    section: LevelSection;
    onItemMove: (itemIndex: number, newOffset: number) => void;
    onLengthChange: (length: number) => void;
    onItemUpdate: (itemIndex: number, field: string, value: any) => void;
    onMessageUpdate: (messageIndex: number, field: string, value: any) => void;
    onMessageAdd: () => void;
    onMessageDelete: (messageIndex: number) => void;
}

function SectionEditor({ section, onItemMove, onLengthChange, onItemUpdate, onMessageUpdate, onMessageAdd, onMessageDelete }: SectionEditorProps) {
    const timelineRef = useRef<HTMLDivElement>(null);
    const [draggingItem, setDraggingItem] = useState<number | null>(null);
    const [draggingMessageBound, setDraggingMessageBound] = useState<{index: number, bound: 'start' | 'end' | 'move'} | null>(null);

    // Timeline visual constants
    const MIN_VISUAL_WIDTH = 600; 
    // We map section.length to 100% width of timeline container

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!timelineRef.current) return;
            
            const rect = timelineRef.current.getBoundingClientRect();
            const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
            
            // Convert pixels back to Z units
            const percentage = x / rect.width;
            const newOffset = percentage * section.length;
            
            if (draggingItem !== null) {
                onItemMove(draggingItem, newOffset);
            } else if (draggingMessageBound !== null) {
                const msg = section.messages[draggingMessageBound.index];
                if (draggingMessageBound.bound === 'start') {
                    const bounded = Math.max(0, Math.min(newOffset, msg.endOffset - 100));
                    onMessageUpdate(draggingMessageBound.index, 'startOffset', Math.floor(bounded));
                } else if (draggingMessageBound.bound === 'end') {
                    const bounded = Math.max(msg.startOffset + 100, Math.min(newOffset, section.length));
                    onMessageUpdate(draggingMessageBound.index, 'endOffset', Math.floor(bounded));
                } else if (draggingMessageBound.bound === 'move') {
                    const duration = msg.endOffset - msg.startOffset;
                    let newStart = newOffset - duration / 2;
                    let newEnd = newStart + duration;
                    if (newStart < 0) {
                        newStart = 0;
                        newEnd = duration;
                    } else if (newEnd > section.length) {
                        newEnd = section.length;
                        newStart = newEnd - duration;
                    }
                    onMessageUpdate(draggingMessageBound.index, 'startOffset', Math.floor(newStart));
                    onMessageUpdate(draggingMessageBound.index, 'endOffset', Math.floor(newEnd));
                }
            }
        };

        const handleMouseUp = () => {
            setDraggingItem(null);
            setDraggingMessageBound(null);
        };

        if (draggingItem !== null || draggingMessageBound !== null) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [draggingItem, draggingMessageBound, section.length, onItemMove, onMessageUpdate, section.messages]);

    const getBgColor = () => {
        if (section.type === 'route') return 'bg-gray-600';
        if (section.ecoleType === 'primaire') return 'bg-red-800';
        if (section.ecoleType === 'secondaire') return 'bg-blue-800';
        if (section.ecoleType === 'universite') return 'bg-gray-400';
        if (section.ecoleType === 'cdkc') return 'bg-purple-800';
        return 'bg-gray-500';
    };

    return (
        <div className="bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-bold text-yellow-300 font-sans">Phase {section.id}: {section.name}</h3>
                <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-400">Longueur Z:</label>
                    <input 
                        type="number" 
                        value={section.length}
                        onChange={(e) => onLengthChange(parseInt(e.target.value) || 1000)}
                        className="bg-gray-900 text-white px-2 py-1 rounded w-24 border border-gray-600 text-right"
                    />
                </div>
            </div>
            
            {/* Timeline */}
            <div className="relative mt-8 mb-8 select-none">
                <div 
                    ref={timelineRef}
                    className={`h-16 w-full ${getBgColor()} rounded relative border-2 border-gray-600 shadow-inner overflow-hidden`}
                >
                    {/* Markers */}
                    <div className="absolute top-0 left-0 h-full w-px bg-white/30" />
                    <div className="absolute top-0 right-0 h-full w-px bg-white/30" />
                    
                    <div className="absolute -bottom-6 left-0 text-xs text-gray-400">0</div>
                    <div className="absolute -bottom-6 right-0 text-xs text-gray-400">{section.length}</div>
                    
                    {/* Messages */}
                    {section.messages?.map((msg, mIdx) => {
                        const startPct = (msg.startOffset / section.length) * 100;
                        const endPct = (msg.endOffset / section.length) * 100;
                        const widthPct = endPct - startPct;
                        return (
                            <div 
                                key={`msg-${mIdx}`}
                                className="absolute top-0 h-6 bg-green-600/70 hover:bg-green-500/80 border-b-2 border-green-400 z-10 flex items-center group rounded cursor-grab select-none"
                                style={{ left: `${startPct}%`, width: `${widthPct}%` }}
                                onMouseDown={(e) => {
                                    if ((e.target as HTMLElement).hasAttribute('data-resize')) return;
                                    e.preventDefault();
                                    setDraggingMessageBound({index: mIdx, bound: 'move'});
                                }}
                            >
                                <div 
                                    data-resize="start"
                                    className="absolute left-0 w-2 h-full cursor-ew-resize bg-green-400/50 hover:bg-white/90 rounded-l" 
                                    onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); setDraggingMessageBound({index: mIdx, bound: 'start'}) }}
                                />
                                <div className="truncate text-[9px] px-2 text-white font-black drop-shadow pointer-events-none w-full text-center">
                                    {msg.text}
                                </div>
                                <div 
                                    data-resize="end"
                                    className="absolute right-0 w-2 h-full cursor-ew-resize bg-green-400/50 hover:bg-white/90 rounded-r" 
                                    onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); setDraggingMessageBound({index: mIdx, bound: 'end'}) }}
                                />
                            </div>
                        );
                    })}

                    {/* Items */}
                    {section.items.map((item, idx) => {
                        const percentage = (item.zOffset / section.length) * 100;
                        const isDragging = draggingItem === idx;
                        
                        return (
                            <div 
                                key={idx}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    setDraggingItem(idx);
                                }}
                                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center cursor-grab ${isDragging ? 'cursor-grabbing z-10' : 'z-0'}`}
                                style={{ left: `${percentage}%` }}
                            >
                                <div className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap shadow-md mb-1
                                    ${item.type === 'bulletin' ? 'bg-yellow-500 text-black' : 
                                      item.type === 'bac' ? 'bg-white text-black' : 
                                      item.type === 'bourse' ? 'bg-green-500 text-black' :
                                      item.type === 'police' ? 'bg-blue-600 text-white' :
                                      item.type === 'condon' ? 'bg-cyan-400 text-black' :
                                      item.type === 'biere' ? 'bg-orange-500 text-white' :
                                      'bg-gray-700 text-white border border-gray-500'}`}
                                >
                                    {item.type} {item.grade ? `(${item.grade})` : ''}
                                </div>
                                <div className="w-0.5 h-4 bg-white/50" />
                                <div className={`w-4 h-4 rounded-full border-2 border-black ${isDragging ? 'bg-yellow-400 scale-125' : 'bg-white hover:bg-gray-300'}`} />
                                <div className="text-[10px] text-gray-300 mt-1">{Math.floor(item.zOffset)}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
            
            {/* Message Text Editor */}
            <div className="mt-4 pt-4 border-t border-gray-700">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-bold text-gray-400">Textes des messages (Dialogue de Zone)</h4>
                    <button 
                        onClick={onMessageAdd}
                        className="bg-green-600 hover:bg-green-500 text-white px-2 py-1 rounded text-xs font-bold font-sans transition-colors"
                    >
                        + Ajouter un message
                    </button>
                </div>
                {section.messages && section.messages.length > 0 ? (
                    <div className="flex flex-col gap-2">
                        {section.messages.map((msg, mIdx) => (
                            <div key={`msg-edit-${mIdx}`} className="bg-gray-900 p-2 rounded text-xs flex flex-wrap gap-2 justify-between items-center border border-gray-700">
                                <span className="text-gray-500 font-mono text-[10px] w-12">MSG {mIdx+1}</span>
                                <input
                                    type="text"
                                    className="bg-gray-800 text-white flex-1 min-w-[200px] px-2 py-1 rounded border border-gray-600 focus:border-yellow-400 outline-none"
                                    value={msg.text}
                                    onChange={(e) => onMessageUpdate(mIdx, 'text', e.target.value)}
                                />
                                <div className="flex items-center gap-2">
                                    <label className="text-gray-500 text-[10px]">Début:</label>
                                    <input 
                                        type="number" 
                                        className="bg-gray-800 text-white w-16 text-center rounded border border-gray-600"
                                        value={msg.startOffset}
                                        onChange={(e) => onMessageUpdate(mIdx, 'startOffset', parseInt(e.target.value) || 0)}
                                    />
                                    <label className="text-gray-500 text-[10px] ml-2">Fin:</label>
                                    <input 
                                        type="number" 
                                        className="bg-gray-800 text-white w-16 text-center rounded border border-gray-600"
                                        value={msg.endOffset}
                                        onChange={(e) => onMessageUpdate(mIdx, 'endOffset', parseInt(e.target.value) || 0)}
                                    />
                                    <button 
                                        onClick={() => onMessageDelete(mIdx)}
                                        className="text-red-500 hover:text-red-400 font-bold px-2 py-1 ml-2 bg-red-900/30 hover:bg-red-900/60 rounded"
                                        title="Supprimer le message"
                                    >
                                        Suppr.
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-xs text-gray-500 italic">Aucun message de zone configuré pour cette phase.</div>
                )}
            </div>

            {/* Item Editor Grid */}
            {section.items.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                    <h4 className="text-sm font-bold text-gray-400 mb-2 font-sans">Configuration des Items & Personnages rencontrés</h4>
                    <div className="flex flex-col gap-2">
                        {section.items.map((item, idx) => (
                            <div key={idx} className="bg-gray-900 p-2 rounded text-xs flex flex-wrap gap-2 justify-between items-center border border-gray-700">
                                <div className="flex items-center gap-2 min-w-[150px]">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                        item.type === 'bulletin' ? 'bg-yellow-500 text-black' : 
                                        item.type === 'bac' ? 'bg-white text-black' : 
                                        item.type === 'bourse' ? 'bg-green-500 text-black' :
                                        item.type === 'police' ? 'bg-blue-600 text-white' :
                                        item.type === 'condon' ? 'bg-cyan-400 text-black' :
                                        item.type === 'biere' ? 'bg-orange-500 text-white' :
                                        'bg-gray-700 text-white border border-gray-500'
                                    }`}>{item.type}</span>
                                    <span className="text-gray-500 text-[10px] font-mono">Z: {Math.floor(item.zOffset)}</span>
                                </div>
                                <div className="flex-1 min-w-[200px] flex items-center gap-2">
                                    <label className="text-gray-500 text-[10px]">Message d'interaction:</label>
                                    <input 
                                        type="text"
                                        placeholder="Utiliser le message système standard"
                                        className="bg-gray-800 text-white flex-1 px-2 py-1 rounded border border-gray-600 focus:border-yellow-400 outline-none"
                                        value={(item as any).dialogue || ''}
                                        onChange={(e) => onItemUpdate(idx, 'dialogue', e.target.value)}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="text-gray-500">X:</label>
                                    <input 
                                        type="number" 
                                        className="bg-gray-800 text-white w-14 text-center rounded border border-gray-600"
                                        value={item.x}
                                        onChange={(e) => {
                                            onItemUpdate(idx, 'x', parseInt(e.target.value) || 0);
                                        }}
                                    />
                                    <label className="text-gray-500 ml-2">Y:</label>
                                    <input 
                                        type="number" 
                                        className="bg-gray-800 text-white w-14 text-center rounded border border-gray-600"
                                        value={item.y || 0}
                                        onChange={(e) => {
                                            onItemUpdate(idx, 'y', parseInt(e.target.value) || 0);
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

interface MessagesEditorProps {
    messagesData: GameMessagesConfig;
    setMessagesData: (data: GameMessagesConfig) => void;
}

function MessagesEditor({ messagesData, setMessagesData }: MessagesEditorProps) {
    const updateField = (category: 'root' | 'obstacles', key: string, value: string) => {
        const newData = { ...messagesData };
        if (category === 'root') {
            (newData as any)[key] = value;
        } else {
            (newData.obstacles as any)[key] = value;
        }
        setMessagesData(newData);
    };

    const rootKeys = ['start', 'restart', 'win', 'cdkc_reached'];
    const obstacleKeys = Object.keys(messagesData.obstacles);

    return (
        <div className="space-y-6 pb-20">
            <div className="bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700">
                <h3 className="text-lg font-bold text-yellow-300 mb-4">Messages Principaux</h3>
                <div className="grid grid-cols-1 gap-4">
                    {rootKeys.map(key => (
                        <div key={key} className="flex flex-col gap-1">
                            <label className="text-sm font-bold text-gray-400 capitalize">{key.replace('_', ' ')}:</label>
                            <input
                                type="text"
                                className="bg-gray-900 text-white px-3 py-2 rounded border border-gray-600 w-full focus:border-yellow-400 outline-none"
                                value={(messagesData as any)[key]}
                                onChange={(e) => updateField('root', key, e.target.value)}
                            />
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700">
                <h3 className="text-lg font-bold text-yellow-300 mb-4">Messages Obstacles / Items</h3>
                <p className="text-xs text-gray-400 mb-4">
                    Note: Utilisez les balises <strong>{`{pts}`}</strong> pour insérer le pointage et <strong>{`{grade}`}</strong> pour les diplômes.
                </p>
                <div className="grid grid-cols-1 gap-4">
                    {obstacleKeys.map(key => (
                        <div key={key} className="flex flex-col gap-1">
                            <label className="text-sm font-bold text-gray-400 capitalize">{key.replace('_', ' ')}:</label>
                            <input
                                type="text"
                                className="bg-gray-900 text-white px-3 py-2 rounded border border-gray-600 w-full focus:border-yellow-400 outline-none"
                                value={(messagesData.obstacles as any)[key]}
                                onChange={(e) => updateField('obstacles', key, e.target.value)}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
