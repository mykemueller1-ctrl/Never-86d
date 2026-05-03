import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ChefHat, Plus, DollarSign, Percent, Clock, Edit2, Trash2, RefreshCw, Package, ChevronDown, ChevronUp } from "lucide-react";

interface RecipeCostScreenProps {
  onBack: () => void;
  staffUser?: { id: number; name: string; role: string } | null;
}

type Tab = 'recipes' | 'menu-cost' | 'add';

export default function RecipeCostScreen({ onBack }: RecipeCostScreenProps) {
  const [tab, setTab] = useState<Tab>('recipes');
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null);
  const [expandedRecipe, setExpandedRecipe] = useState<number | null>(null);

  // Form state for new recipe
  const [newRecipe, setNewRecipe] = useState({ name: '', category: 'food', subcategory: '', servingSize: '', prepTimeMinutes: 0, menuPrice: '', targetFoodCostPercent: '30' });
  // Form state for new ingredient
  const [newIngredient, setNewIngredient] = useState({ ingredientName: '', quantity: '', unitOfMeasure: '', costPerUnit: '', yieldPercent: '100' });

  const recipes = trpc.recipes.list.useQuery();
  const recipeDetail = trpc.recipes.getById.useQuery({ id: selectedRecipeId! }, { enabled: !!selectedRecipeId });
  const menuItems = trpc.menuCost.list.useQuery();
  const foodCostSummary = trpc.menuCost.summary.useQuery();
  const utils = trpc.useUtils();

  const createRecipe = trpc.recipes.create.useMutation({ onSuccess: () => { utils.recipes.list.invalidate(); setTab('recipes'); setNewRecipe({ name: '', category: 'food', subcategory: '', servingSize: '', prepTimeMinutes: 0, menuPrice: '', targetFoodCostPercent: '30' }); } });
  const addIngredient = trpc.recipes.addIngredient.useMutation({ onSuccess: () => { utils.recipes.getById.invalidate({ id: selectedRecipeId! }); setNewIngredient({ ingredientName: '', quantity: '', unitOfMeasure: '', costPerUnit: '', yieldPercent: '100' }); } });
  const deleteIngredient = trpc.recipes.deleteIngredient.useMutation({ onSuccess: () => { utils.recipes.getById.invalidate({ id: selectedRecipeId! }); } });
  const recalcCost = trpc.recipes.recalculateCost.useMutation({ onSuccess: () => { utils.recipes.getById.invalidate({ id: selectedRecipeId! }); utils.recipes.list.invalidate(); } });

  const formatCurrency = (n: string | number | null) => {
    const val = typeof n === 'string' ? parseFloat(n) : (n || 0);
    return `$${val.toFixed(2)}`;
  };

  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      food: 'bg-orange-500/10 text-orange-300 border-orange-500/20',
      pizza: 'bg-red-500/10 text-red-300 border-red-500/20',
      beer: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
      liquor: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
      pop: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
    };
    return colors[cat] || 'bg-white/5 text-white/60 border-white/10';
  };

  // Recipe detail view
  if (selectedRecipeId && recipeDetail.data) {
    const r = recipeDetail.data;
    const ingredients = r.ingredients || [];
    const totalCost = ingredients.reduce((sum: number, ing: any) => sum + parseFloat(ing.totalCost || '0'), 0);
    const menuPrice = parseFloat(r.menuPrice || '0');
    const foodCostPct = menuPrice > 0 ? (totalCost / menuPrice * 100) : 0;
    const targetPct = parseFloat(r.targetFoodCostPercent || '30');
    const isOverTarget = foodCostPct > targetPct;

    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <div className="bg-gradient-to-r from-orange-900/80 to-red-900/80 border-b border-white/10">
          <div className="px-4 py-3 flex items-center gap-3">
            <button onClick={() => setSelectedRecipeId(null)} className="p-2 -ml-2 hover:bg-white/10 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-bold">{r.name}</h1>
              <p className="text-xs text-white/60">{r.category} · {r.servingSize || 'No serving size'}</p>
            </div>
            <button
              onClick={() => recalcCost.mutate({ recipeId: r.id })}
              className="p-2 hover:bg-white/10 rounded-lg"
              title="Recalculate cost from SKU prices"
            >
              <RefreshCw className={`w-5 h-5 ${recalcCost.isPending ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* Cost Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-[10px] uppercase text-white/40">Recipe Cost</div>
              <div className="text-xl font-black text-orange-300">{formatCurrency(totalCost)}</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-[10px] uppercase text-white/40">Menu Price</div>
              <div className="text-xl font-black">{formatCurrency(menuPrice)}</div>
            </div>
            <div className={`rounded-xl p-3 text-center ${isOverTarget ? 'bg-red-500/10 border border-red-500/20' : 'bg-emerald-500/10 border border-emerald-500/20'}`}>
              <div className="text-[10px] uppercase text-white/40">Food Cost %</div>
              <div className={`text-xl font-black ${isOverTarget ? 'text-red-400' : 'text-emerald-400'}`}>
                {foodCostPct.toFixed(1)}%
              </div>
              <div className="text-[10px] text-white/30">Target: {targetPct}%</div>
            </div>
          </div>

          {/* Margin */}
          {menuPrice > 0 && (
            <div className="bg-gradient-to-r from-emerald-900/20 to-teal-900/20 rounded-xl p-4 border border-emerald-500/20">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60">Gross Margin</span>
                <span className="text-lg font-bold text-emerald-400">{formatCurrency(menuPrice - totalCost)}</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2 mt-2">
                <div
                  className={`h-2 rounded-full ${isOverTarget ? 'bg-red-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(foodCostPct, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Prep Info */}
          {(r.prepTimeMinutes || r.prepInstructions) && (
            <div className="bg-white/5 rounded-xl p-4 border border-white/5">
              {r.prepTimeMinutes && (
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-white/40" />
                  <span className="text-sm">{r.prepTimeMinutes} min prep</span>
                </div>
              )}
              {r.prepInstructions && (
                <p className="text-xs text-white/50 whitespace-pre-wrap">{r.prepInstructions}</p>
              )}
            </div>
          )}

          {/* Ingredients */}
          <div className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-sm font-bold">Ingredients ({ingredients.length})</h3>
              <span className="text-xs text-white/40">Total: {formatCurrency(totalCost)}</span>
            </div>
            {ingredients.length === 0 ? (
              <div className="px-4 py-8 text-center text-white/30 text-sm">No ingredients yet</div>
            ) : (
              <div className="divide-y divide-white/5">
                {ingredients.map((ing: any) => (
                  <div key={ing.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{ing.ingredientName}</div>
                      <div className="text-[10px] text-white/40">
                        {ing.quantity} {ing.unitOfMeasure} @ {formatCurrency(ing.costPerUnit)}/{ing.unitOfMeasure}
                        {ing.yieldPercent && parseFloat(ing.yieldPercent) < 100 && ` · ${ing.yieldPercent}% yield`}
                      </div>
                    </div>
                    <div className="text-sm font-bold text-orange-300">{formatCurrency(ing.totalCost)}</div>
                    <button onClick={() => deleteIngredient.mutate({ id: ing.id })} className="p-1 hover:bg-red-500/20 rounded">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Ingredient Form */}
            <div className="px-4 py-3 bg-white/[0.02] border-t border-white/5">
              <div className="text-xs font-semibold text-white/40 mb-2">Add Ingredient</div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="col-span-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
                  placeholder="Ingredient name"
                  value={newIngredient.ingredientName}
                  onChange={e => setNewIngredient(p => ({ ...p, ingredientName: e.target.value }))}
                />
                <input
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
                  placeholder="Quantity"
                  value={newIngredient.quantity}
                  onChange={e => setNewIngredient(p => ({ ...p, quantity: e.target.value }))}
                />
                <input
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
                  placeholder="Unit (oz, lb, ea)"
                  value={newIngredient.unitOfMeasure}
                  onChange={e => setNewIngredient(p => ({ ...p, unitOfMeasure: e.target.value }))}
                />
                <input
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
                  placeholder="Cost per unit"
                  value={newIngredient.costPerUnit}
                  onChange={e => setNewIngredient(p => ({ ...p, costPerUnit: e.target.value }))}
                />
                <input
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
                  placeholder="Yield % (100)"
                  value={newIngredient.yieldPercent}
                  onChange={e => setNewIngredient(p => ({ ...p, yieldPercent: e.target.value }))}
                />
              </div>
              <button
                onClick={() => {
                  if (!newIngredient.ingredientName || !newIngredient.quantity) return;
                  const qty = parseFloat(newIngredient.quantity) || 0;
                  const cpu = parseFloat(newIngredient.costPerUnit) || 0;
                  const yld = parseFloat(newIngredient.yieldPercent) || 100;
                  const totalCost = ((qty * cpu) / (yld / 100)).toFixed(2);
                  addIngredient.mutate({
                    recipeId: r.id,
                    ingredientName: newIngredient.ingredientName,
                    quantity: newIngredient.quantity,
                    unitOfMeasure: newIngredient.unitOfMeasure,
                    costPerUnit: newIngredient.costPerUnit || '0',
                    totalCost,
                    yieldPercent: newIngredient.yieldPercent || '100',
                  });
                }}
                disabled={addIngredient.isPending || !newIngredient.ingredientName}
                className="mt-2 w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 rounded-lg py-2 text-sm font-semibold transition-colors"
              >
                {addIngredient.isPending ? 'Adding...' : 'Add Ingredient'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-900/80 to-red-900/80 border-b border-white/10">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-white/10 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-orange-400" />
              Recipe & Food Cost
            </h1>
            <p className="text-xs text-white/60">Recipe costing, menu engineering, margin analysis</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5">
        {[
          { key: 'recipes' as Tab, label: 'Recipes' },
          { key: 'menu-cost' as Tab, label: 'Menu Cost' },
          { key: 'add' as Tab, label: '+ New' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === t.key ? 'text-orange-400 border-b-2 border-orange-400' : 'text-white/40'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-4 py-4">
        {tab === 'recipes' && (
          <div className="space-y-3">
            {recipes.isLoading ? (
              <div className="text-center py-10 text-white/30">Loading recipes...</div>
            ) : (recipes.data?.length || 0) === 0 ? (
              <div className="text-center py-10">
                <ChefHat className="w-12 h-12 text-white/10 mx-auto mb-3" />
                <p className="text-white/30 text-sm">No recipes yet</p>
                <button onClick={() => setTab('add')} className="mt-3 text-orange-400 text-sm font-medium">+ Add first recipe</button>
              </div>
            ) : (
              recipes.data?.map((r: any) => {
                const isExpanded = expandedRecipe === r.id;
                const costPct = r.menuPrice && parseFloat(r.menuPrice) > 0
                  ? ((parseFloat(r.totalCost || '0') / parseFloat(r.menuPrice)) * 100)
                  : null;
                return (
                  <div key={r.id} className="bg-white/5 rounded-xl border border-white/5 overflow-hidden">
                    <button
                      onClick={() => setExpandedRecipe(isExpanded ? null : r.id)}
                      className="w-full px-4 py-3 flex items-center gap-3 text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{r.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getCategoryColor(r.category)}`}>
                            {r.category}
                          </span>
                          {r.prepTimeMinutes && (
                            <span className="text-[10px] text-white/30 flex items-center gap-1">
                              <Clock className="w-3 h-3" />{r.prepTimeMinutes}m
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-orange-300">{formatCurrency(r.totalCost)}</div>
                        {costPct !== null && (
                          <div className={`text-[10px] ${costPct > 30 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {costPct.toFixed(1)}% cost
                          </div>
                        )}
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-3 border-t border-white/5 pt-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedRecipeId(r.id)}
                            className="flex-1 bg-orange-600/20 text-orange-300 rounded-lg py-2 text-xs font-medium hover:bg-orange-600/30 transition-colors flex items-center justify-center gap-1"
                          >
                            <Edit2 className="w-3 h-3" /> Edit & Ingredients
                          </button>
                          <button
                            onClick={() => { recalcCost.mutate({ recipeId: r.id }); }}
                            className="bg-white/5 text-white/60 rounded-lg px-3 py-2 text-xs hover:bg-white/10 transition-colors flex items-center gap-1"
                          >
                            <RefreshCw className="w-3 h-3" /> Recalc
                          </button>
                        </div>
                        {r.menuPrice && (
                          <div className="mt-2 text-xs text-white/40">
                            Menu: {formatCurrency(r.menuPrice)} · Margin: {formatCurrency(parseFloat(r.menuPrice) - parseFloat(r.totalCost || '0'))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === 'menu-cost' && (
          <div className="space-y-4">
            {/* Food Cost Summary */}
            {foodCostSummary.data && (
              <div className="bg-gradient-to-br from-orange-900/30 to-red-900/30 rounded-2xl p-4 border border-orange-500/20">
                <h3 className="text-sm font-bold mb-3">Food Cost Summary</h3>
                <div className="space-y-2">
                  {(foodCostSummary.data as any[]).map((cat: any, i: number) => (
                    <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                      <span className="text-sm capitalize">{cat.category}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-white/40">{cat.itemCount} items</span>
                        <span className="text-sm font-bold">{formatCurrency(cat.avgCost)}</span>
                        <span className={`text-xs font-medium ${parseFloat(cat.avgFoodCostPct || '0') > 30 ? 'text-red-400' : 'text-emerald-400'}`}>
                          {parseFloat(cat.avgFoodCostPct || '0').toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Menu Items */}
            {menuItems.isLoading ? (
              <div className="text-center py-10 text-white/30">Loading menu items...</div>
            ) : (menuItems.data?.length || 0) === 0 ? (
              <div className="text-center py-10">
                <Package className="w-12 h-12 text-white/10 mx-auto mb-3" />
                <p className="text-white/30 text-sm">No menu items linked yet</p>
                <p className="text-white/20 text-xs mt-1">Create recipes first, then link them to POS menu items</p>
              </div>
            ) : (
              <div className="space-y-2">
                {(menuItems.data as any[]).map((item: any) => {
                  const costPct = item.actualFoodCostPercent ? parseFloat(item.actualFoodCostPercent) : null;
                  return (
                    <div key={item.id} className="bg-white/5 rounded-xl px-4 py-3 border border-white/5 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{item.posItemName}</div>
                        <div className="text-[10px] text-white/40">{item.category}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold">{formatCurrency(item.menuPrice)}</div>
                        {costPct !== null && (
                          <div className={`text-[10px] ${costPct > 30 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {costPct.toFixed(1)}% food cost
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'add' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold">New Recipe</h3>
            <div className="space-y-3">
              <input
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm"
                placeholder="Recipe name (e.g., Loaded Nachos)"
                value={newRecipe.name}
                onChange={e => setNewRecipe(p => ({ ...p, name: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm"
                  value={newRecipe.category}
                  onChange={e => setNewRecipe(p => ({ ...p, category: e.target.value }))}
                >
                  <option value="food">Food</option>
                  <option value="pizza">Pizza</option>
                  <option value="beer">Beer</option>
                  <option value="liquor">Liquor</option>
                  <option value="pop">Pop</option>
                </select>
                <input
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm"
                  placeholder="Subcategory"
                  value={newRecipe.subcategory}
                  onChange={e => setNewRecipe(p => ({ ...p, subcategory: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm"
                  placeholder="Serving size"
                  value={newRecipe.servingSize}
                  onChange={e => setNewRecipe(p => ({ ...p, servingSize: e.target.value }))}
                />
                <input
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm"
                  placeholder="Prep time (min)"
                  type="number"
                  value={newRecipe.prepTimeMinutes || ''}
                  onChange={e => setNewRecipe(p => ({ ...p, prepTimeMinutes: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm"
                  placeholder="Menu price"
                  value={newRecipe.menuPrice}
                  onChange={e => setNewRecipe(p => ({ ...p, menuPrice: e.target.value }))}
                />
                <input
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm"
                  placeholder="Target food cost %"
                  value={newRecipe.targetFoodCostPercent}
                  onChange={e => setNewRecipe(p => ({ ...p, targetFoodCostPercent: e.target.value }))}
                />
              </div>
              <button
                onClick={() => {
                  if (!newRecipe.name) return;
                  createRecipe.mutate(newRecipe);
                }}
                disabled={createRecipe.isPending || !newRecipe.name}
                className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 rounded-xl py-3 text-sm font-bold transition-colors"
              >
                {createRecipe.isPending ? 'Creating...' : 'Create Recipe'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
