import React, { useState, useMemo, useEffect } from 'react';
import { LevelSection, LevelItem, GameMessagesConfig } from '../levelData';
import { Trash2, Plus, Settings } from 'lucide-react';

interface GlobalTimelineEditorProps {
    data: LevelSection[];
    setData: (data: LevelSection[]) => void;
    messagesData: GameMessagesConfig;
    setMessagesData: (data: GameMessagesConfig) => void;
}

export default function GlobalTimelineEditor({ data, setData, messagesData, setMessagesData }: GlobalTimelineEditorProps) {
    const [zoom, setZoom] = useState(0.15);
    const [selectedElement, setSelectedElement] = useState<{ type: 'section' | 'item' | 'message', sIdx: number, idx?: number } | null>(null);

    const [dragInfo, setDragInfo] = useState<{
        type: 'item' | 'message-start' | 'message-end' | 'message-move' | 'section-resize';
        sIdx: number;
        idx?: number;
        startX: number;
        startZ: number;
        currentZ: number;
    } | null>(null);

    const { absoluteSections, totalLength } = useMemo(() => {
        let currentZ = 0;
        const absSecs = data.map((sec, sIdx) => {
            const startZ = currentZ;
            const endZ = currentZ + sec.length;
            currentZ += sec.length;
            return {
                ...sec,
                sIdx,
                startZ,
                endZ,
                absItems: sec.items.map((item, iIdx) => ({
                    ...item,
                    sIdx,
                    iIdx,
                    absZ: startZ + item.zOffset
                })),
                absMessages: (sec.messages || []).map((msg, mIdx) => ({
                    ...msg,
                    sIdx,
                    mIdx,
                    absStart: startZ + msg.startOffset,
                    absEnd: startZ + msg.endOffset
                }))
            };
        });
        return { absoluteSections: absSecs, totalLength: currentZ };
    }, [data]);

    const allItems = useMemo(() => absoluteSections.flatMap(s => s.absItems), [absoluteSections]);
    const allMessages = useMemo(() => absoluteSections.flatMap(s => s.absMessages), [absoluteSections]);

    useEffect(() => {
        if (!dragInfo) return;

        const handleMouseMove = (e: MouseEvent) => {
            const deltaX = e.clientX - dragInfo.startX;
            const deltaZ = deltaX / zoom;
            setDragInfo(prev => prev ? { ...prev, currentZ: prev.startZ + deltaZ } : null);
        };

        const handleMouseUp = () => {
            if (dragInfo) {
                applyDrag(dragInfo);
            }
            setDragInfo(null);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragInfo, zoom, data]); // eslint-disable-line react-hooks/exhaustive-deps

    const applyDrag = (info: typeof dragInfo) => {
        if (!info) return;
        const newData = data.map(s => ({ ...s, items: [...s.items], messages: [...(s.messages || [])] }));

        const getSectionForZ = (absZ: number) => {
            let current = 0;
            for (let i = 0; i < newData.length; i++) {
                if (absZ >= current && absZ <= current + newData[i].length) {
                    return { sIdx: i, zOffset: absZ - current };
                }
                current += newData[i].length;
            }
            const lastIdx = newData.length - 1;
            return { sIdx: lastIdx, zOffset: Math.min(Math.max(0, absZ - (current - newData[lastIdx].length)), newData[lastIdx].length) };
        };

        if (info.type === 'section-resize') {
            const sec = newData[info.sIdx];
            const newLen = Math.max(100, sec.length + (info.currentZ - info.startZ));
            sec.length = Math.round(newLen);
        } else if (info.type === 'item' && info.idx !== undefined) {
            const item = newData[info.sIdx].items[info.idx];
            newData[info.sIdx].items.splice(info.idx, 1);

            const target = getSectionForZ(info.currentZ);
            item.zOffset = Math.max(0, Math.round(target.zOffset));
            newData[target.sIdx].items.push(item);
            
            // Update selection to new index
            setSelectedElement({ type: 'item', sIdx: target.sIdx, idx: newData[target.sIdx].items.length - 1 });
        } else if (info.type === 'message-move' && info.idx !== undefined) {
            const msg = newData[info.sIdx].messages![info.idx];
            const duration = msg.endOffset - msg.startOffset;

            newData[info.sIdx].messages!.splice(info.idx, 1);
            const targetStart = getSectionForZ(info.currentZ);

            newData[targetStart.sIdx].messages = newData[targetStart.sIdx].messages || [];
            newData[targetStart.sIdx].messages.push({
                ...msg,
                startOffset: Math.round(targetStart.zOffset),
                endOffset: Math.round(targetStart.zOffset + duration)
            });
            
            setSelectedElement({ type: 'message', sIdx: targetStart.sIdx, idx: newData[targetStart.sIdx].messages!.length - 1 });
        } else if (info.type === 'message-start' && info.idx !== undefined) {
            const msg = newData[info.sIdx].messages![info.idx];
            const delta = info.currentZ - info.startZ;
            msg.startOffset = Math.round(Math.max(0, Math.min(msg.startOffset + delta, msg.endOffset - 50)));
        } else if (info.type === 'message-end' && info.idx !== undefined) {
            const msg = newData[info.sIdx].messages![info.idx];
            const delta = info.currentZ - info.startZ;
            msg.endOffset = Math.round(Math.max(msg.startOffset + 50, Math.min(msg.endOffset + delta, newData[info.sIdx].length)));
        }

        setData(newData);
    };

    const updateItem = (field: string, value: any) => {
        if (selectedElement?.type !== 'item' || selectedElement.idx === undefined) return;
        const newData = data.map(s => ({ ...s, items: s.items.map(i => ({...i})), messages: [...(s.messages || [])] }));
        const item: any = newData[selectedElement.sIdx].items[selectedElement.idx];
        item[field] = value;
        setData(newData);
    };

    const updateMessage = (field: string, value: any) => {
        if (selectedElement?.type !== 'message' || selectedElement.idx === undefined) return;
        const newData = data.map(s => ({ ...s, items: [...s.items], messages: (s.messages || []).map(m => ({...m})) }));
        const msg: any = newData[selectedElement.sIdx].messages![selectedElement.idx];
        msg[field] = value;
        setData(newData);
    };

    const updateSection = (field: string, value: any) => {
        if (selectedElement?.type !== 'section') return;
        const newData = [...data];
        const sec: any = { ...newData[selectedElement.sIdx] };
        sec[field] = value;
        newData[selectedElement.sIdx] = sec;
        setData(newData);
    };

    const deleteSelected = () => {
        if (!selectedElement) return;
        const newData = [...data];
        if (selectedElement.type === 'item') {
            newData[selectedElement.sIdx].items.splice(selectedElement.idx!, 1);
        } else if (selectedElement.type === 'message') {
            newData[selectedElement.sIdx].messages!.splice(selectedElement.idx!, 1);
        } else if (selectedElement.type === 'section') {
            if (newData.length <= 1) return alert("Impossible de supprimer la dernière section.");
            newData.splice(selectedElement.sIdx, 1);
        }
        setData(newData);
        setSelectedElement(null);
    };

    const addElementAtZ = (type: 'item' | 'message', z: number) => {
        const newData = [...data];
        let current = 0;
        let targetSIdx = newData.length - 1;
        let targetZ = z;

        for (let i = 0; i < newData.length; i++) {
            if (z >= current && z <= current + newData[i].length) {
                targetSIdx = i;
                targetZ = Math.round(z - current);
                break;
            }
            current += newData[i].length;
        }
        
        if (targetSIdx === newData.length - 1 && z > current) {
             targetZ = Math.round(z - (current - newData[targetSIdx].length));
        }

        if (type === 'item') {
            newData[targetSIdx].items.push({
                type: 'bulletin',
                x: 0,
                zOffset: targetZ
            });
            setSelectedElement({ type: 'item', sIdx: targetSIdx, idx: newData[targetSIdx].items.length - 1 });
        } else if (type === 'message') {
            if (!newData[targetSIdx].messages) newData[targetSIdx].messages = [];
            newData[targetSIdx].messages.push({
                text: 'Nouveau message',
                startOffset: targetZ,
                endOffset: Math.min(newData[targetSIdx].length, targetZ + 500)
            });
            setSelectedElement({ type: 'message', sIdx: targetSIdx, idx: newData[targetSIdx].messages.length - 1 });
        }
        setData(newData);
    };

    const updateMessageField = (category: 'root' | 'obstacles', key: string, value: string) => {
        const newData = { ...messagesData };
        if (category === 'root') {
            (newData as any)[key] = value;
        } else {
            newData.obstacles = { ...newData.obstacles };
            (newData.obstacles as any)[key] = value;
        }
        setMessagesData(newData);
    };

    const renderProperties = () => {
        if (!selectedElement) {
            const rootKeys = ['start', 'restart', 'win', 'cdkc_reached'];
            const obstacleKeys = Object.keys(messagesData.obstacles);
            
            return (
                <div className="space-y-6 h-full overflow-y-auto pr-2">
                    <div className="flex items-center gap-2 mb-2 text-gray-400 text-sm italic">
                        <Settings size={14} /> Cliquez sur un élément de la timeline pour l'éditer, ou éditez les messages globaux ci-dessous.
                    </div>
                    
                    <div className="bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700">
                        <h3 className="text-lg font-bold text-yellow-300 mb-4">Messages Principaux</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {rootKeys.map(key => (
                                <div key={key} className="flex flex-col gap-1">
                                    <label className="text-sm font-bold text-gray-400 capitalize">{key.replace('_', ' ')}:</label>
                                    <input
                                        type="text"
                                        className="bg-gray-900 text-white px-3 py-2 rounded border border-gray-600 w-full focus:border-yellow-400 outline-none"
                                        value={(messagesData as any)[key]}
                                        onChange={(e) => updateMessageField('root', key, e.target.value)}
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {obstacleKeys.map(key => (
                                <div key={key} className="flex flex-col gap-1">
                                    <label className="text-sm font-bold text-gray-400 capitalize">{key.replace('_', ' ')}:</label>
                                    <input
                                        type="text"
                                        className="bg-gray-900 text-white px-3 py-2 rounded border border-gray-600 w-full focus:border-yellow-400 outline-none"
                                        value={(messagesData.obstacles as any)[key]}
                                        onChange={(e) => updateMessageField('obstacles', key, e.target.value)}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            );
        }

        if (selectedElement.type === 'section') {
            const sec = data[selectedElement.sIdx];
            if (!sec) return null;
            return (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-yellow-300">Phase {sec.id} : {sec.name}</h3>
                        <button onClick={deleteSelected} className="text-red-400 hover:text-red-300 flex items-center gap-1 text-sm"><Trash2 size={14} /> Supprimer</button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <label className="block text-gray-400 mb-1">Nom</label>
                            <input type="text" className="w-full bg-gray-800 rounded p-1 text-white border border-gray-600 focus:border-yellow-400" value={sec.name} onChange={e => updateSection('name', e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-gray-400 mb-1">Type</label>
                            <select className="w-full bg-gray-800 rounded p-1 text-white border border-gray-600" value={sec.type} onChange={e => updateSection('type', e.target.value)}>
                                <option value="route">Route</option>
                                <option value="ecole">École</option>
                            </select>
                        </div>
                        {sec.type === 'ecole' && (
                            <div>
                                <label className="block text-gray-400 mb-1">Niveau</label>
                                <select className="w-full bg-gray-800 rounded p-1 text-white border border-gray-600" value={sec.ecoleType || 'primaire'} onChange={e => updateSection('ecoleType', e.target.value)}>
                                    <option value="primaire">Primaire</option>
                                    <option value="secondaire">Secondaire</option>
                                    <option value="universite">Université</option>
                                    <option value="cdkc">CDKC (Fin)</option>
                                </select>
                            </div>
                        )}
                        <div>
                            <label className="block text-gray-400 mb-1">Longueur (Z)</label>
                            <input type="number" className="w-full bg-gray-800 rounded p-1 text-white border border-gray-600" value={sec.length} onChange={e => updateSection('length', parseInt(e.target.value) || 1000)} />
                        </div>
                    </div>
                    <div className="flex gap-2 mt-4 pt-4 border-t border-gray-800">
                        <button 
                            className="bg-green-700 hover:bg-green-600 text-white px-3 py-1 rounded text-xs font-bold flex items-center gap-1"
                            onClick={() => {
                                const newData = [...data];
                                newData[selectedElement.sIdx].items.push({ type: 'bulletin', zOffset: Math.min(500, sec.length / 2), x: 0 });
                                setData(newData);
                                setSelectedElement({ type: 'item', sIdx: selectedElement.sIdx, idx: newData[selectedElement.sIdx].items.length - 1 });
                            }}
                        ><Plus size={14} /> Ajouter un Obstacle/Item</button>
                        <button 
                            className="bg-blue-700 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold flex items-center gap-1"
                            onClick={() => {
                                const newData = [...data];
                                if (!newData[selectedElement.sIdx].messages) newData[selectedElement.sIdx].messages = [];
                                newData[selectedElement.sIdx].messages!.push({ text: 'Nouveau message', startOffset: 0, endOffset: Math.min(2000, sec.length) });
                                setData(newData);
                                setSelectedElement({ type: 'message', sIdx: selectedElement.sIdx, idx: newData[selectedElement.sIdx].messages!.length - 1 });
                            }}
                        ><Plus size={14} /> Ajouter un Message</button>
                    </div>
                </div>
            );
        }

        if (selectedElement.type === 'item') {
            const sec = data[selectedElement.sIdx];
            const item = sec?.items[selectedElement.idx!];
            if (!item) return null;
            return (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-yellow-300">Édition Item : {item.type}</h3>
                        <button onClick={deleteSelected} className="text-red-400 hover:text-red-300 flex items-center gap-1 text-sm"><Trash2 size={14} /> Supprimer</button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <label className="block text-gray-400 mb-1">Type</label>
                            <select className="w-full bg-gray-800 rounded p-1 text-white border border-gray-600" value={item.type} onChange={e => updateItem('type', e.target.value)}>
                                <option value="bulletin">Bulletin</option>
                                <option value="bonnet">Bonnet d'âne</option>
                                <option value="biere">Bière</option>
                                <option value="seringue">Seringue</option>
                                <option value="condon">Condon</option>
                                <option value="gars">Gars</option>
                                <option value="bourse">Bourse</option>
                                <option value="pere">Père</option>
                                <option value="guichet">Guichet</option>
                                <option value="police">Police</option>
                                <option value="bac">Bac (Diplôme)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-gray-400 mb-1">Offset Z (Relatif)</label>
                            <input type="number" className="w-full bg-gray-800 rounded p-1 text-white border border-gray-600" value={Math.floor(item.zOffset)} onChange={e => updateItem('zOffset', parseInt(e.target.value) || 0)} />
                        </div>
                        <div>
                            <label className="block text-gray-400 mb-1">Position X (-150 à 150)</label>
                            <input type="number" className="w-full bg-gray-800 rounded p-1 text-white border border-gray-600" value={item.x} onChange={e => updateItem('x', parseInt(e.target.value) || 0)} />
                        </div>
                        <div>
                            <label className="block text-gray-400 mb-1">Hauteur Y (Optionnel)</label>
                            <input type="number" className="w-full bg-gray-800 rounded p-1 text-white border border-gray-600" value={item.y || 0} onChange={e => updateItem('y', parseInt(e.target.value) || 0)} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <label className="block text-gray-400 mb-1">Dialogue Customisé (Optionnel)</label>
                            <input type="text" placeholder="Ex: Aïe ! Ça fait mal !" className="w-full bg-gray-800 rounded p-1 text-white border border-gray-600" value={(item as any).dialogue || ''} onChange={e => updateItem('dialogue', e.target.value)} />
                        </div>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-gray-400 mb-1">Grade (BAC/Bulletin)</label>
                                <input type="text" placeholder="Ex: A+" className="w-full bg-gray-800 rounded p-1 text-white border border-gray-600" value={item.grade || ''} onChange={e => updateItem('grade', e.target.value)} />
                            </div>
                            <div className="flex-1">
                                <label className="block text-gray-400 mb-1">Points</label>
                                <input type="number" className="w-full bg-gray-800 rounded p-1 text-white border border-gray-600" value={item.pts || ''} onChange={e => updateItem('pts', e.target.value)} />
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        if (selectedElement.type === 'message') {
            const sec = data[selectedElement.sIdx];
            const msg = sec?.messages?.[selectedElement.idx!];
            if (!msg) return null;
            return (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-yellow-300">Édition Message</h3>
                        <button onClick={deleteSelected} className="text-red-400 hover:text-red-300 flex items-center gap-1 text-sm"><Trash2 size={14} /> Supprimer</button>
                    </div>
                    <div>
                        <label className="block text-gray-400 mb-1">Texte Affiché</label>
                        <input type="text" className="w-full bg-gray-800 rounded p-2 text-white border border-gray-600 focus:border-yellow-400" value={msg.text} onChange={e => updateMessage('text', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <label className="block text-gray-400 mb-1">Début (Z Relatif)</label>
                            <input type="number" className="w-full bg-gray-800 rounded p-1 text-white border border-gray-600" value={Math.floor(msg.startOffset)} onChange={e => updateMessage('startOffset', parseInt(e.target.value) || 0)} />
                        </div>
                        <div>
                            <label className="block text-gray-400 mb-1">Fin (Z Relatif)</label>
                            <input type="number" className="w-full bg-gray-800 rounded p-1 text-white border border-gray-600" value={Math.floor(msg.endOffset)} onChange={e => updateMessage('endOffset', parseInt(e.target.value) || 0)} />
                        </div>
                    </div>
                </div>
            );
        }

        return null;
    };

    // Calculate ruler ticks
    const ticks = [];
    const tickInterval = 1000;
    const numTicks = Math.ceil(totalLength / tickInterval);
    for (let i = 0; i <= numTicks; i++) {
        ticks.push(i * tickInterval);
    }

    return (
        <div className="flex flex-col h-full gap-4 pb-10">
            <div className="flex justify-between items-center bg-gray-800 p-3 rounded-lg border border-gray-700">
                <div className="flex items-center gap-6">
                    <span className="font-bold text-yellow-400 text-lg">Timeline Multipiste</span>
                    <div className="flex items-center gap-2 text-sm bg-gray-900 px-3 py-1 rounded-full border border-gray-600">
                        <label className="text-gray-400 font-bold">Zoom:</label>
                        <input type="range" min="0.02" max="0.5" step="0.01" value={zoom} onChange={e => setZoom(parseFloat(e.target.value))} className="w-32 accent-yellow-400" />
                        <span className="text-yellow-100 font-mono w-10">{Math.round(zoom * 100)}%</span>
                    </div>
                </div>
                <button 
                    onClick={() => {
                        const newData = [...data];
                        newData.push({
                            id: newData.length + 1,
                            name: `Nouvelle Phase ${newData.length + 1}`,
                            type: 'route',
                            length: 2000,
                            items: [],
                            messages: []
                        });
                        setData(newData);
                        setSelectedElement({ type: 'section', sIdx: newData.length - 1 });
                        setTimeout(() => {
                            const scroller = document.getElementById('timeline-scroll-container');
                            if (scroller) scroller.scrollLeft = scroller.scrollWidth;
                        }, 50);
                    }}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded font-bold text-sm transition-colors flex items-center gap-1"
                ><Plus size={16} /> Ajouter une Phase</button>
            </div>

            <div id="timeline-scroll-container" className="flex-none bg-gray-950 rounded-lg border border-gray-700 overflow-x-auto overflow-y-hidden relative shadow-inner custom-scrollbar" style={{ height: '220px' }}>
                <div style={{ width: Math.max(800, totalLength * zoom + 100) + 'px', height: '100%', position: 'relative' }}>
                    
                    {/* Ruler */}
                    <div className="absolute top-0 left-0 w-full h-6 border-b border-gray-800 bg-gray-900/80 sticky-top z-0">
                        {ticks.map(t => (
                            <div key={t} className="absolute top-0 h-full border-l border-gray-700" style={{ left: t * zoom }}>
                                <span className="text-[9px] text-gray-500 ml-1 font-mono">{t}</span>
                            </div>
                        ))}
                    </div>

                    {/* Track 1: Sections */}
                    <div className="absolute left-0 w-full" style={{ top: '30px', height: '40px' }}>
                        <div className="absolute -left-16 w-16 text-[10px] text-gray-500 text-right pr-2 leading-10 font-bold uppercase tracking-wider sticky left-0 bg-gray-950 z-30 shadow-[4px_0_10px_rgba(0,0,0,0.5)]">Zones</div>
                        {absoluteSections.map(sec => (
                            <div 
                                key={`sec-${sec.sIdx}`}
                                className={`absolute h-8 top-1 rounded border-2 ${selectedElement?.type === 'section' && selectedElement.sIdx === sec.sIdx ? 'border-yellow-400 bg-blue-800' : 'border-blue-900 bg-blue-900/40 hover:bg-blue-800/60'} cursor-pointer transition-colors group`}
                                style={{ left: sec.startZ * zoom, width: sec.length * zoom }}
                                onClick={() => setSelectedElement({ type: 'section', sIdx: sec.sIdx })}
                            >
                                <span className="text-[10px] text-white font-bold px-2 py-1 block truncate drop-shadow">{sec.name}</span>
                                <div 
                                    className="absolute right-0 top-0 w-2 h-full cursor-col-resize hover:bg-white/80 bg-blue-400/30 rounded-r"
                                    onMouseDown={(e) => {
                                        e.stopPropagation();
                                        setDragInfo({ type: 'section-resize', sIdx: sec.sIdx, startX: e.clientX, startZ: sec.length, currentZ: sec.length });
                                    }}
                                />
                            </div>
                        ))}
                    </div>

                    {/* Track 2: Messages */}
                    <div 
                        className="absolute left-0 w-full hover:bg-white/5 transition-colors cursor-crosshair group" 
                        style={{ top: '80px', height: '36px' }}
                        onDoubleClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = e.clientX - rect.left;
                            const z = x / zoom;
                            addElementAtZ('message', z);
                        }}
                    >
                        <div className="absolute -left-16 w-16 text-[10px] text-gray-500 text-right pr-2 leading-9 font-bold uppercase tracking-wider sticky left-0 bg-gray-950 z-30 shadow-[4px_0_10px_rgba(0,0,0,0.5)]">Textes</div>
                        
                        {/* Instruction tooltip */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none z-0">
                            <span className="bg-black/50 text-gray-400 text-xs px-2 py-1 rounded">Double-cliquez pour ajouter un message</span>
                        </div>

                        {allMessages.map(msg => {
                            const isDragging = dragInfo?.type.startsWith('message') && dragInfo.sIdx === msg.sIdx && dragInfo.idx === msg.mIdx;
                            let start = msg.absStart;
                            let end = msg.absEnd;
                            if (isDragging) {
                                if (dragInfo.type === 'message-move') {
                                    const delta = dragInfo.currentZ - dragInfo.startZ;
                                    start += delta;
                                    end += delta;
                                } else if (dragInfo.type === 'message-start') {
                                    start += dragInfo.currentZ - dragInfo.startZ;
                                } else if (dragInfo.type === 'message-end') {
                                    end += dragInfo.currentZ - dragInfo.startZ;
                                }
                            }
                            
                            // Ensure minimum width visually if duration is 0
                            const width = Math.max(10, (end - start) * zoom);
                            
                            return (
                                <div
                                    key={`msg-${msg.sIdx}-${msg.mIdx}`}
                                    className={`absolute h-8 top-0.5 rounded border-2 ${selectedElement?.type === 'message' && selectedElement.sIdx === msg.sIdx && selectedElement.idx === msg.mIdx ? 'border-yellow-400 bg-green-600 z-20' : 'border-green-600 bg-green-900/80 hover:bg-green-700/90 z-10'} cursor-grab flex items-center overflow-hidden transition-colors shadow-md`}
                                    style={{ left: start * zoom, width: width }}
                                    onClick={(e) => { e.stopPropagation(); setSelectedElement({ type: 'message', sIdx: msg.sIdx, idx: msg.mIdx }); }}
                                    onMouseDown={(e) => {
                                        e.stopPropagation();
                                        setDragInfo({ type: 'message-move', sIdx: msg.sIdx, idx: msg.mIdx, startX: e.clientX, startZ: start, currentZ: start });
                                    }}
                                >
                                    <div 
                                        className="absolute left-0 top-0 w-3 h-full cursor-col-resize hover:bg-white/80 bg-green-400/60 flex items-center justify-center border-r border-green-800" 
                                        onMouseDown={(e) => {
                                            e.stopPropagation();
                                            setDragInfo({ type: 'message-start', sIdx: msg.sIdx, idx: msg.mIdx, startX: e.clientX, startZ: start, currentZ: start });
                                        }}
                                    >
                                        <div className="w-0.5 h-3 bg-white/50 rounded-full" />
                                    </div>
                                    <span className="text-[10px] text-white font-bold px-4 truncate pointer-events-none drop-shadow w-full text-center">{msg.text}</span>
                                    <div 
                                        className="absolute right-0 top-0 w-3 h-full cursor-col-resize hover:bg-white/80 bg-green-400/60 flex items-center justify-center border-l border-green-800" 
                                        onMouseDown={(e) => {
                                            e.stopPropagation();
                                            setDragInfo({ type: 'message-end', sIdx: msg.sIdx, idx: msg.mIdx, startX: e.clientX, startZ: end, currentZ: end });
                                        }}
                                    >
                                        <div className="w-0.5 h-3 bg-white/50 rounded-full" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Track 3: Items */}
                    <div 
                        className="absolute left-0 w-full hover:bg-white/5 transition-colors cursor-crosshair group" 
                        style={{ top: '126px', height: '60px' }}
                        onDoubleClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = e.clientX - rect.left;
                            const z = x / zoom;
                            addElementAtZ('item', z);
                        }}
                    >
                        <div className="absolute -left-16 w-16 text-[10px] text-gray-500 text-right pr-2 leading-[60px] font-bold uppercase tracking-wider sticky left-0 bg-gray-950 z-30 shadow-[4px_0_10px_rgba(0,0,0,0.5)]">Items</div>
                        
                        {/* Instruction tooltip */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none z-0">
                            <span className="bg-black/50 text-gray-400 text-xs px-2 py-1 rounded">Double-cliquez pour ajouter un item</span>
                        </div>
                        {allItems.map(item => {
                            const isDragging = dragInfo?.type === 'item' && dragInfo.sIdx === item.sIdx && dragInfo.idx === item.iIdx;
                            let z = item.absZ;
                            if (isDragging) {
                                z = dragInfo.currentZ;
                            }
                            
                            const isSelected = selectedElement?.type === 'item' && selectedElement.sIdx === item.sIdx && selectedElement.idx === item.iIdx;
                            
                            let colorClass = 'bg-gray-700 border-gray-500';
                            if (item.type === 'bulletin') colorClass = 'bg-yellow-600 border-yellow-400';
                            if (item.type === 'bac') colorClass = 'bg-white border-gray-300 text-black';
                            if (item.type === 'bourse') colorClass = 'bg-green-500 border-green-300 text-black';
                            if (item.type === 'bonnet') colorClass = 'bg-orange-800 border-orange-500';
                            if (item.type === 'seringue') colorClass = 'bg-red-800 border-red-500';
                            if (item.type === 'biere') colorClass = 'bg-orange-500 border-orange-300';
                            if (item.type === 'police') colorClass = 'bg-blue-600 border-blue-400';
                            if (item.type === 'condon') colorClass = 'bg-cyan-500 border-cyan-300 text-black';
                            if (item.type === 'gars') colorClass = 'bg-pink-700 border-pink-400';

                            return (
                                <div
                                    key={`item-${item.sIdx}-${item.iIdx}`}
                                    className={`absolute top-2 w-6 h-6 -ml-3 rounded-full border-2 flex items-center justify-center cursor-grab shadow-lg transition-transform ${isSelected ? 'ring-2 ring-yellow-400 z-20 scale-125' : 'z-10 hover:scale-110'} ${colorClass}`}
                                    style={{ left: z * zoom }}
                                    onClick={() => setSelectedElement({ type: 'item', sIdx: item.sIdx, idx: item.iIdx })}
                                    onMouseDown={(e) => {
                                        e.stopPropagation();
                                        setDragInfo({ type: 'item', sIdx: item.sIdx, idx: item.iIdx, startX: e.clientX, startZ: item.absZ, currentZ: item.absZ });
                                    }}
                                    title={`${item.type} (x: ${item.x})`}
                                >
                                    <span className={`text-[8px] font-bold truncate ${colorClass.includes('text-black') ? 'text-black' : 'text-white'}`}>{item.type.substring(0,2).toUpperCase()}</span>
                                    {item.x < -50 && <div className="absolute -left-1 top-1/2 w-1 h-1 bg-white rounded-full"></div>}
                                    {item.x > 50 && <div className="absolute -right-1 top-1/2 w-1 h-1 bg-white rounded-full"></div>}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Properties Panel */}
            <div className="flex-1 bg-gray-900 border border-gray-700 rounded-lg p-5 shadow-inner">
                {renderProperties()}
            </div>
        </div>
    );
}
