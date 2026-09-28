import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  ArrowLeft,
  Save,
  CheckCircle,
  UserPlus,
  Package,
  Gem,
  Coins,
  Factory,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const itemTypes = [
  "Necklace", "Earrings", "Ring", "Bracelet", "Bangle", "Pendant",
  "Brooch", "Anklet", "Baalis", "Bindi / Tika", "Clips", "Set", "Other"
];

const metalTypes = ["Gold 22k", "Gold 24k", "Gold 18k", "Silver 925", "Platinum", "Other"];

type OrderItemForm = {
  itemName: string;
  vendorId: string;
  estimatedLabourCharges: string;
  bodyMakingRate: string;
  stoneSettingRate: string;
  estimatedMetalType: string;
  estimatedMetalWeight: string;
  estimatedMetalWastage: string;
  estimatedMetalRate: string;
  estimatedMetalValue: string;
  estimatedGemType: string;
  estimatedGemQty: string;
  estimatedGemWeight: string;
  estimatedGemRate: string;
  estimatedGemCalcBy: string;
  estimatedGemValue: string;
  comments: string;
};

const emptyItem: OrderItemForm = {
  itemName: "",
  vendorId: "",
  estimatedLabourCharges: "",
  bodyMakingRate: "Simple",
  stoneSettingRate: "Simple",
  estimatedMetalType: "Gold 22k",
  estimatedMetalWeight: "",
  estimatedMetalWastage: "",
  estimatedMetalRate: "",
  estimatedMetalValue: "",
  estimatedGemType: "",
  estimatedGemQty: "",
  estimatedGemWeight: "",
  estimatedGemRate: "",
  estimatedGemCalcBy: "Weight",
  estimatedGemValue: "",
  comments: "",
};

type AdvanceMetalForm = {
  itemName: string;
  receivedDate: string;
  weight: string;
  alloy: string;
  netWeightRate: string;
  value: string;
  comments: string;
};

type AdvanceGemForm = {
  itemName: string;
  qty: string;
  weight: string;
  comments: string;
};

type NewCustomerForm = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  company: string;
};

export default function CreateOrder() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // Form state
  const [orderForm, setOrderForm] = useState({
    customerId: null as number | null,
    orderDate: new Date().toISOString().split("T")[0],
    deliveryDate: "",
    description: "",
    comments: "",
    advanceCash: "",
  });
  const [orderItems, setOrderItems] = useState<OrderItemForm[]>([{ ...emptyItem }]);
  const [advanceMetals, setAdvanceMetals] = useState<AdvanceMetalForm[]>([]);
  const [advanceGems, setAdvanceGems] = useState<AdvanceGemForm[]>([]);

  // New customer dialog
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState<NewCustomerForm>({
    firstName: "", lastName: "", phone: "", email: "", address: "", city: "", company: "",
  });

  // New vendor dialog
  const [showNewVendor, setShowNewVendor] = useState(false);
  const [vendorForItemIdx, setVendorForItemIdx] = useState<number | null>(null);
  const [newVendorForm, setNewVendorForm] = useState({
    name: "", phone: "", city: "", specialization: "",
  });

  // Custom gems
  const [customGems, setCustomGems] = useState<string[]>([]);
  const [showAddGem, setShowAddGem] = useState(false);
  const [newGemName, setNewGemName] = useState("");
  const [gemForItemIdx, setGemForItemIdx] = useState<number | null>(null);

  const defaultGems = [
    "Diamond", "Ruby", "Emerald", "Sapphire", "Pearl", "Topaz", "Amethyst",
    "Aquamarine", "Garnet", "Opal", "Turquoise", "Tanzanite", "Peridot",
    "Citrine", "Zircon", "Cubic Zirconia", "Moissanite", "Onyx", "Jade",
    "Lapis Lazuli", "Moonstone", "Alexandrite", "Morganite", "Spinel",
    "Tourmaline", "Iolite", "Kunzite", "Coral", "Amber", "Chrysoberyl",
    "Swarovski Crystal",
  ];
  const allGems = [...defaultGems, ...customGems];

  const handleAddGem = () => {
    if (!newGemName.trim()) { toast.error("Gem name is required"); return; }
    if (allGems.includes(newGemName.trim())) { toast.error("This gem already exists"); return; }
    setCustomGems((prev) => [...prev, newGemName.trim()]);
    if (gemForItemIdx !== null) {
      updateItem(gemForItemIdx, "estimatedGemType", newGemName.trim());
    }
    setNewGemName("");
    setShowAddGem(false);
    setGemForItemIdx(null);
    toast.success(`"${newGemName.trim()}" added to gem list`);
  };

  // Data queries
  const { data: customers } = trpc.customers.list.useQuery();
  const { data: vendors } = trpc.vendors.list.useQuery();

  // Mutations
  const createMutation = trpc.orders.create.useMutation({
    onSuccess: (data) => {
      toast.success("Order created successfully");
      utils.orders.list.invalidate();
      if (data?.id) {
        setLocation(`/orders/${data.id}`);
      } else {
        setLocation("/orders");
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create order");
    },
  });

  const createVendorMutation = trpc.vendors.create.useMutation({
    onSuccess: (data) => {
      toast.success("Vendor created");
      setShowNewVendor(false);
      setNewVendorForm({ name: "", phone: "", city: "", specialization: "" });
      utils.vendors.list.invalidate();
      if (data?.id && vendorForItemIdx !== null) {
        updateItem(vendorForItemIdx, "vendorId", data.id.toString());
        setVendorForItemIdx(null);
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create vendor");
    },
  });

  const handleCreateVendor = () => {
    if (!newVendorForm.name) { toast.error("Vendor name is required"); return; }
    createVendorMutation.mutate({
      name: newVendorForm.name,
      phone: newVendorForm.phone || undefined,
      city: newVendorForm.city || undefined,
      specialization: newVendorForm.specialization || undefined,
    });
  };

  const createCustomerMutation = trpc.customers.create.useMutation({
    onSuccess: (data) => {
      toast.success("Customer created and assigned");
      setShowNewCustomer(false);
      setNewCustomerForm({ firstName: "", lastName: "", phone: "", email: "", address: "", city: "", company: "" });
      utils.customers.list.invalidate();
      if (data?.id) {
        setOrderForm((prev) => ({ ...prev, customerId: data.id }));
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create customer");
    },
  });

  const handleCreateCustomer = () => {
    if (!newCustomerForm.firstName || !newCustomerForm.lastName) {
      toast.error("First and last name are required");
      return;
    }
    createCustomerMutation.mutate({
      firstName: newCustomerForm.firstName,
      lastName: newCustomerForm.lastName,
      phone: newCustomerForm.phone || undefined,
      email: newCustomerForm.email || undefined,
      address: newCustomerForm.address || undefined,
      city: newCustomerForm.city || undefined,
      notes: newCustomerForm.company ? `Company: ${newCustomerForm.company}` : undefined,
    });
  };

  const handleSubmit = (saveAsDraft: boolean) => {
    if (!orderForm.customerId) {
      toast.error("Please select a customer");
      return;
    }

    const items = orderItems
      .filter((item) => item.itemName)
      .map((item) => ({
        itemName: item.itemName,
        vendorId: item.vendorId ? Number(item.vendorId) : undefined,
        quantity: 1,
        unitPrice: (
          Number(item.estimatedMetalValue || 0) +
          Number(item.estimatedGemValue || 0) +
          Number(item.estimatedLabourCharges || 0)
        ).toFixed(2),
        totalPrice: (
          Number(item.estimatedMetalValue || 0) +
          Number(item.estimatedGemValue || 0) +
          Number(item.estimatedLabourCharges || 0)
        ).toFixed(2),
        estimatedMetalType: item.estimatedMetalType || undefined,
        estimatedMetalWeight: item.estimatedMetalWeight || undefined,
        estimatedMetalWastage: item.estimatedMetalWastage || undefined,
        estimatedMetalRate: item.estimatedMetalRate || undefined,
        estimatedMetalValue: item.estimatedMetalValue || undefined,
        estimatedGemType: item.estimatedGemType || undefined,
        estimatedGemQty: item.estimatedGemQty ? parseInt(item.estimatedGemQty) : undefined,
        estimatedGemWeight: item.estimatedGemWeight || undefined,
        estimatedGemRate: item.estimatedGemRate || undefined,
        estimatedGemCalcBy: item.estimatedGemCalcBy || undefined,
        estimatedGemValue: item.estimatedGemValue || undefined,
        estimatedLabourCharges: item.estimatedLabourCharges || undefined,
        bodyMakingRateType: item.bodyMakingRate.toLowerCase(),
        stoneSettingRateType: item.stoneSettingRate.toLowerCase(),
        comments: item.comments || undefined,
      }));

    const totalPrice = items.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);
    const totalWeight = items.reduce((sum, item) => sum + Number(item.estimatedMetalWeight || 0), 0);
    const validAdvanceMetals = advanceMetals
      .filter((metal) => metal.itemName || metal.weight || metal.value)
      .map((metal) => ({ ...metal }));
    const validAdvanceGems = advanceGems
      .filter((gem) => gem.itemName || gem.qty || gem.weight)
      .map((gem) => ({
        ...gem,
        qty: gem.qty ? Number(gem.qty) : undefined,
      }));

    createMutation.mutate({
      customerId: orderForm.customerId,
      status: saveAsDraft ? ("saved" as any) : "pending",
      orderDate: orderForm.orderDate || undefined,
      expectedDelivery: orderForm.deliveryDate || undefined,
      notes: orderForm.comments || undefined,
      description: orderForm.description || undefined,
      advanceCash: orderForm.advanceCash || undefined,
      totalItems: items.length,
      totalWeight: totalWeight.toFixed(3),
      totalPrice: totalPrice.toFixed(2),
      items: items.length > 0 ? items : undefined,
      advanceMetals: validAdvanceMetals.length > 0 ? validAdvanceMetals : undefined,
      advanceGems: validAdvanceGems.length > 0 ? validAdvanceGems : undefined,
    });
  };

  const updateItem = (idx: number, field: keyof OrderItemForm, value: string) => {
    setOrderItems((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      // Auto-calculate metal value
      if (field === "estimatedMetalWeight" || field === "estimatedMetalWastage" || field === "estimatedMetalRate") {
        const weight = parseFloat(updated[idx].estimatedMetalWeight) || 0;
        const wastage = parseFloat(updated[idx].estimatedMetalWastage) || 0;
        const rate = parseFloat(updated[idx].estimatedMetalRate) || 0;
        const netWeight = weight + (weight * wastage / 100);
        updated[idx].estimatedMetalValue = (netWeight * rate).toFixed(2);
      }
      // Auto-calculate gem value
      if (field === "estimatedGemQty" || field === "estimatedGemWeight" || field === "estimatedGemRate" || field === "estimatedGemCalcBy") {
        const qty = parseFloat(updated[idx].estimatedGemQty) || 0;
        const gemWeight = parseFloat(updated[idx].estimatedGemWeight) || 0;
        const gemRate = parseFloat(updated[idx].estimatedGemRate) || 0;
        const calcBy = updated[idx].estimatedGemCalcBy;
        if (calcBy === "Weight") {
          updated[idx].estimatedGemValue = (gemWeight * gemRate).toFixed(2);
        } else {
          updated[idx].estimatedGemValue = (qty * gemRate).toFixed(2);
        }
      }
      return updated;
    });
  };

  const selectedCustomer = customers?.find((c) => c.id === orderForm.customerId);

  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/orders")} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-foreground">Sales Order Card</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Create a new sales order with items and vendor assignments</p>
        </div>
      </div>

      {/* ============ CUSTOMER & ORDER DETAILS ============ */}
      <div className="rounded-xl bg-card border border-border overflow-hidden">
        <div className="px-5 py-3 bg-primary/10 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Order Details</h2>
        </div>
        <div className="p-5 space-y-4">
          {/* Customer Row */}
          <div className="grid grid-cols-[140px_1fr] items-center gap-4">
            <Label className="text-sm font-medium text-foreground">Customer *</Label>
            <div className="flex gap-2">
              <Select
                value={orderForm.customerId?.toString() || ""}
                onValueChange={(v) => setOrderForm({ ...orderForm, customerId: v ? Number(v) : null })}
              >
                <SelectTrigger className="bg-input border-border flex-1">
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers?.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      CS {String(c.id).padStart(6, "0")} {c.firstName} {c.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => setShowNewCustomer(true)} title="Add New Customer">
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Dates Row */}
          <div className="grid grid-cols-2 gap-6">
            <div className="grid grid-cols-[140px_1fr] items-center gap-4">
              <Label className="text-sm font-medium text-foreground">Order Date</Label>
              <Input
                type="date"
                value={orderForm.orderDate}
                onChange={(e) => setOrderForm({ ...orderForm, orderDate: e.target.value })}
                className="bg-input border-border"
              />
            </div>
            <div className="grid grid-cols-[140px_1fr] items-center gap-4">
              <Label className="text-sm font-medium text-foreground">Delivery Date</Label>
              <Input
                type="date"
                value={orderForm.deliveryDate}
                onChange={(e) => setOrderForm({ ...orderForm, deliveryDate: e.target.value })}
                className="bg-input border-border"
              />
            </div>
          </div>

          {/* Description */}
          <div className="grid grid-cols-[140px_1fr] items-start gap-4">
            <Label className="text-sm font-medium text-foreground pt-2">Description</Label>
            <Textarea
              value={orderForm.description}
              onChange={(e) => setOrderForm({ ...orderForm, description: e.target.value })}
              placeholder="e.g., Gold Set 22k (s)"
              className="bg-input border-border"
              rows={2}
            />
          </div>

          {/* Comments */}
          <div className="grid grid-cols-[140px_1fr] items-start gap-4">
            <Label className="text-sm font-medium text-foreground pt-2">Comments</Label>
            <Textarea
              value={orderForm.comments}
              onChange={(e) => setOrderForm({ ...orderForm, comments: e.target.value })}
              placeholder="Additional notes..."
              className="bg-input border-border"
              rows={2}
            />
          </div>

          {/* Advance Cash */}
          <div className="grid grid-cols-[140px_1fr] items-center gap-4">
            <Label className="text-sm font-medium text-foreground">Advance Cash</Label>
            <Input
              type="number"
              value={orderForm.advanceCash}
              onChange={(e) => setOrderForm({ ...orderForm, advanceCash: e.target.value })}
              placeholder="0.00"
              className="bg-input border-border max-w-xs"
            />
          </div>
        </div>
      </div>

      {/* ============ ADVANCE METALS ============ */}
      <div className="rounded-xl bg-card border border-border overflow-hidden">
        <div className="px-5 py-3 bg-amber-500/10 dark:bg-amber-500/5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <h2 className="text-sm font-semibold text-foreground">Advance Metals</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() =>
              setAdvanceMetals([
                ...advanceMetals,
                { itemName: "", receivedDate: "", weight: "", alloy: "", netWeightRate: "", value: "", comments: "" },
              ])
            }
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add More
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Items</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Recv. Date</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Weight (gm)</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Alloy</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Net.Wgt Rate</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Value</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Comments</th>
                <th className="px-4 py-2.5 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {advanceMetals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-muted-foreground text-xs italic">
                    No advance metals added. Click "Add More" to add entries.
                  </td>
                </tr>
              ) : (
                advanceMetals.map((metal, idx) => (
                  <tr key={idx} className="border-b border-border/50">
                    <td className="px-3 py-1.5">
                      <Input
                        value={metal.itemName}
                        onChange={(e) => {
                          const u = [...advanceMetals]; u[idx].itemName = e.target.value; setAdvanceMetals(u);
                        }}
                        className="bg-input border-border h-8 text-xs"
                        placeholder="Gold 22k"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <Input
                        type="date"
                        value={metal.receivedDate}
                        onChange={(e) => {
                          const u = [...advanceMetals]; u[idx].receivedDate = e.target.value; setAdvanceMetals(u);
                        }}
                        className="bg-input border-border h-8 text-xs"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <Input
                        type="number"
                        value={metal.weight}
                        onChange={(e) => {
                          const u = [...advanceMetals]; u[idx].weight = e.target.value; setAdvanceMetals(u);
                        }}
                        className="bg-input border-border h-8 text-xs"
                        placeholder="0.000"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <Input
                        value={metal.alloy}
                        onChange={(e) => {
                          const u = [...advanceMetals]; u[idx].alloy = e.target.value; setAdvanceMetals(u);
                        }}
                        className="bg-input border-border h-8 text-xs"
                        placeholder="22k"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <Input
                        type="number"
                        value={metal.netWeightRate}
                        onChange={(e) => {
                          const u = [...advanceMetals]; u[idx].netWeightRate = e.target.value; setAdvanceMetals(u);
                        }}
                        className="bg-input border-border h-8 text-xs"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <Input
                        type="number"
                        value={metal.value}
                        onChange={(e) => {
                          const u = [...advanceMetals]; u[idx].value = e.target.value; setAdvanceMetals(u);
                        }}
                        className="bg-input border-border h-8 text-xs"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <Input
                        value={metal.comments}
                        onChange={(e) => {
                          const u = [...advanceMetals]; u[idx].comments = e.target.value; setAdvanceMetals(u);
                        }}
                        className="bg-input border-border h-8 text-xs"
                        placeholder="Notes"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setAdvanceMetals(advanceMetals.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============ ADVANCE GEMS ============ */}
      <div className="rounded-xl bg-card border border-border overflow-hidden">
        <div className="px-5 py-3 bg-purple-500/10 dark:bg-purple-500/5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gem className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <h2 className="text-sm font-semibold text-foreground">Advance Gems</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() =>
              setAdvanceGems([...advanceGems, { itemName: "", qty: "", weight: "", comments: "" }])
            }
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add More
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Items</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Qty</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Weight</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Comments</th>
                <th className="px-4 py-2.5 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {advanceGems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground text-xs italic">
                    No advance gems added. Click "Add More" to add entries.
                  </td>
                </tr>
              ) : (
                advanceGems.map((gem, idx) => (
                  <tr key={idx} className="border-b border-border/50">
                    <td className="px-3 py-1.5">
                      <Input
                        value={gem.itemName}
                        onChange={(e) => {
                          const u = [...advanceGems]; u[idx].itemName = e.target.value; setAdvanceGems(u);
                        }}
                        className="bg-input border-border h-8 text-xs"
                        placeholder="Emeralds - 01"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <Input
                        type="number"
                        value={gem.qty}
                        onChange={(e) => {
                          const u = [...advanceGems]; u[idx].qty = e.target.value; setAdvanceGems(u);
                        }}
                        className="bg-input border-border h-8 text-xs"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <Input
                        type="number"
                        value={gem.weight}
                        onChange={(e) => {
                          const u = [...advanceGems]; u[idx].weight = e.target.value; setAdvanceGems(u);
                        }}
                        className="bg-input border-border h-8 text-xs"
                        placeholder="0.000"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <Input
                        value={gem.comments}
                        onChange={(e) => {
                          const u = [...advanceGems]; u[idx].comments = e.target.value; setAdvanceGems(u);
                        }}
                        className="bg-input border-border h-8 text-xs"
                        placeholder="Notes"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setAdvanceGems(advanceGems.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============ ORDER ITEMS ============ */}
      <div className="rounded-xl bg-card border border-border overflow-hidden">
        <div className="px-5 py-3 bg-blue-500/10 dark:bg-blue-500/5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-sm font-semibold text-foreground">Order Items</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setOrderItems([...orderItems, { ...emptyItem }])}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Item
          </Button>
        </div>

        <div className="divide-y divide-border">
          {orderItems.map((item, idx) => (
            <div key={idx} className="p-5 space-y-4">
              {/* Item Header */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">
                  Item #{idx + 1} {item.itemName ? `— ${item.itemName}` : ""}
                </span>
                {orderItems.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-destructive hover:text-destructive"
                    onClick={() => setOrderItems(orderItems.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Remove
                  </Button>
                )}
              </div>

              {/* Item Type + Vendor + Labour */}
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Item Type *</Label>
                  <Select value={item.itemName} onValueChange={(v) => updateItem(idx, "itemName", v)}>
                    <SelectTrigger className="bg-input border-border h-9">
                      <SelectValue placeholder="Select item" />
                    </SelectTrigger>
                    <SelectContent>
                      {itemTypes.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Factory className="h-3 w-3" /> Vendor
                  </Label>
                  <div className="flex gap-1.5">
                    <Select value={item.vendorId} onValueChange={(v) => updateItem(idx, "vendorId", v)}>
                      <SelectTrigger className="bg-input border-border h-9">
                        <SelectValue placeholder="Assign vendor" />
                      </SelectTrigger>
                      <SelectContent>
                        {vendors?.map((v: any) => (
                          <SelectItem key={v.id} value={v.id.toString()}>
                            VN {String(v.id).padStart(6, "0")} {v.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() => { setVendorForItemIdx(idx); setShowNewVendor(true); }}
                      title="Add New Vendor"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Body Making Rate</Label>
                  <Select value={item.bodyMakingRate} onValueChange={(v) => updateItem(idx, "bodyMakingRate", v)}>
                    <SelectTrigger className="bg-input border-border h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Simple">Simple</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Complex">Complex</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Stone Setting Rate</Label>
                  <Select value={item.stoneSettingRate} onValueChange={(v) => updateItem(idx, "stoneSettingRate", v)}>
                    <SelectTrigger className="bg-input border-border h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Simple">Simple</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Complex">Complex</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Estimated Metal */}
              <div className="rounded-lg border border-amber-200 dark:border-amber-800/30 bg-amber-50/50 dark:bg-amber-950/10 p-3">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-3 flex items-center gap-1.5">
                  <Coins className="h-3.5 w-3.5" /> Estimated Metal
                </p>
                <div className="grid grid-cols-5 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Metal Type</Label>
                    <Select value={item.estimatedMetalType} onValueChange={(v) => updateItem(idx, "estimatedMetalType", v)}>
                      <SelectTrigger className="bg-white dark:bg-input border-border h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {metalTypes.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Weight (gm)</Label>
                    <Input
                      type="number"
                      value={item.estimatedMetalWeight}
                      onChange={(e) => updateItem(idx, "estimatedMetalWeight", e.target.value)}
                      className="bg-white dark:bg-input border-border h-8 text-xs"
                      placeholder="0.000"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Wastage %</Label>
                    <Input
                      type="number"
                      value={item.estimatedMetalWastage}
                      onChange={(e) => updateItem(idx, "estimatedMetalWastage", e.target.value)}
                      className="bg-white dark:bg-input border-border h-8 text-xs"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Rate (per gm)</Label>
                    <Input
                      type="number"
                      value={item.estimatedMetalRate}
                      onChange={(e) => updateItem(idx, "estimatedMetalRate", e.target.value)}
                      className="bg-white dark:bg-input border-border h-8 text-xs"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Value (auto)</Label>
                    <Input
                      type="number"
                      value={item.estimatedMetalValue}
                      readOnly
                      className="bg-muted/50 border-border h-8 text-xs font-medium"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              {/* Estimated Gems */}
              <div className="rounded-lg border border-purple-200 dark:border-purple-800/30 bg-purple-50/50 dark:bg-purple-950/10 p-3">
                <p className="text-xs font-semibold text-purple-700 dark:text-purple-400 mb-3 flex items-center gap-1.5">
                  <Gem className="h-3.5 w-3.5" /> Estimated Gems
                </p>
                <div className="grid grid-cols-6 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Gem Type</Label>
                    <div className="flex gap-1">
                      <Select value={item.estimatedGemType} onValueChange={(v) => updateItem(idx, "estimatedGemType", v)}>
                        <SelectTrigger className="bg-white dark:bg-input border-border h-8 text-xs">
                          <SelectValue placeholder="Select stone" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {allGems.map((gem) => (
                            <SelectItem key={gem} value={gem}>{gem}</SelectItem>
                          ))}
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => { setGemForItemIdx(idx); setShowAddGem(true); }}
                        title="Add new gem to list"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Qty</Label>
                    <Input
                      type="number"
                      value={item.estimatedGemQty}
                      onChange={(e) => updateItem(idx, "estimatedGemQty", e.target.value)}
                      className="bg-white dark:bg-input border-border h-8 text-xs"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Weight (ct)</Label>
                    <Input
                      type="number"
                      value={item.estimatedGemWeight}
                      onChange={(e) => updateItem(idx, "estimatedGemWeight", e.target.value)}
                      className="bg-white dark:bg-input border-border h-8 text-xs"
                      placeholder="0.000"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Rate</Label>
                    <Input
                      type="number"
                      value={item.estimatedGemRate}
                      onChange={(e) => updateItem(idx, "estimatedGemRate", e.target.value)}
                      className="bg-white dark:bg-input border-border h-8 text-xs"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Calculate By</Label>
                    <Select value={item.estimatedGemCalcBy} onValueChange={(v) => updateItem(idx, "estimatedGemCalcBy", v)}>
                      <SelectTrigger className="bg-white dark:bg-input border-border h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Weight">Weight</SelectItem>
                        <SelectItem value="Quantity">Quantity</SelectItem>
                        <SelectItem value="Percentage">Percentage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Value (auto)</Label>
                    <Input
                      type="number"
                      value={item.estimatedGemValue}
                      readOnly
                      className="bg-muted/50 border-border h-8 text-xs font-medium"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              {/* Labour + Comments */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Estimated Labour Charges (PKR)</Label>
                  <Input
                    type="number"
                    value={item.estimatedLabourCharges}
                    onChange={(e) => updateItem(idx, "estimatedLabourCharges", e.target.value)}
                    className="bg-input border-border h-9"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Comments</Label>
                  <Input
                    value={item.comments}
                    onChange={(e) => updateItem(idx, "comments", e.target.value)}
                    className="bg-input border-border h-9"
                    placeholder="Item notes..."
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ============ ACTION BUTTONS ============ */}
      <div className="flex items-center justify-between rounded-xl bg-card border border-border p-5">
        <div className="text-sm text-muted-foreground">
          {selectedCustomer && (
            <span>
              Customer: <strong className="text-foreground">{selectedCustomer.firstName} {selectedCustomer.lastName}</strong>
              {" | "}
            </span>
          )}
          Items: <strong className="text-foreground">{orderItems.filter((i) => i.itemName).length}</strong>
          {orderForm.advanceCash && (
            <>
              {" | "}Advance: <strong className="text-foreground">PKR {Number(orderForm.advanceCash).toLocaleString()}</strong>
            </>
          )}
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => handleSubmit(true)}
            disabled={createMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            Save & Continue Later
          </Button>
          <Button
            onClick={() => handleSubmit(false)}
            disabled={createMutation.isPending}
            className="gold-gradient text-primary-foreground border-0"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Create Order
          </Button>
        </div>
      </div>

      {/* ============ NEW CUSTOMER DIALOG ============ */}
      <Dialog open={showNewCustomer} onOpenChange={setShowNewCustomer}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add New Customer</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Create a customer and auto-assign to this order
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">First Name *</Label>
                <Input
                  value={newCustomerForm.firstName}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, firstName: e.target.value })}
                  className="bg-input border-border"
                  placeholder="First name"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Last Name *</Label>
                <Input
                  value={newCustomerForm.lastName}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, lastName: e.target.value })}
                  className="bg-input border-border"
                  placeholder="Last name"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Company</Label>
              <Input
                value={newCustomerForm.company}
                onChange={(e) => setNewCustomerForm({ ...newCustomerForm, company: e.target.value })}
                className="bg-input border-border"
                placeholder="Company name"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Phone</Label>
                <Input
                  value={newCustomerForm.phone}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                  className="bg-input border-border"
                  placeholder="+92..."
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Email</Label>
                <Input
                  value={newCustomerForm.email}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, email: e.target.value })}
                  className="bg-input border-border"
                  placeholder="email@example.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Address</Label>
                <Input
                  value={newCustomerForm.address}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, address: e.target.value })}
                  className="bg-input border-border"
                  placeholder="Street address"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">City</Label>
                <Input
                  value={newCustomerForm.city}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, city: e.target.value })}
                  className="bg-input border-border"
                  placeholder="City"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button variant="outline" onClick={() => setShowNewCustomer(false)}>Cancel</Button>
              <Button
                onClick={handleCreateCustomer}
                disabled={createCustomerMutation.isPending}
                className="gold-gradient text-primary-foreground border-0"
              >
                Create & Assign
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============ NEW VENDOR DIALOG ============ */}
      <Dialog open={showNewVendor} onOpenChange={setShowNewVendor}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add New Vendor</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Create a new vendor/craftsman and assign to this item
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Name *</Label>
              <Input
                value={newVendorForm.name}
                onChange={(e) => setNewVendorForm({ ...newVendorForm, name: e.target.value })}
                className="bg-input border-border"
                placeholder="Vendor name"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Phone</Label>
                <Input
                  value={newVendorForm.phone}
                  onChange={(e) => setNewVendorForm({ ...newVendorForm, phone: e.target.value })}
                  className="bg-input border-border"
                  placeholder="+92..."
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">City</Label>
                <Input
                  value={newVendorForm.city}
                  onChange={(e) => setNewVendorForm({ ...newVendorForm, city: e.target.value })}
                  className="bg-input border-border"
                  placeholder="City"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Specialization</Label>
              <Select
                value={newVendorForm.specialization}
                onValueChange={(v) => setNewVendorForm({ ...newVendorForm, specialization: v })}
              >
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Body Making">Body Making</SelectItem>
                  <SelectItem value="Stone Setting">Stone Setting</SelectItem>
                  <SelectItem value="Polishing">Polishing</SelectItem>
                  <SelectItem value="Engraving">Engraving</SelectItem>
                  <SelectItem value="General">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button variant="outline" onClick={() => setShowNewVendor(false)}>Cancel</Button>
              <Button
                onClick={handleCreateVendor}
                disabled={createVendorMutation.isPending}
                className="gold-gradient text-primary-foreground border-0"
              >
                Create & Assign
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============ ADD GEM DIALOG ============ */}
      <Dialog open={showAddGem} onOpenChange={setShowAddGem}>
        <DialogContent className="max-w-sm bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Gem className="h-4 w-4 text-purple-500" /> Add New Gem/Stone
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Add a custom gem or stone name to the selection list
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Gem/Stone Name *</Label>
              <Input
                value={newGemName}
                onChange={(e) => setNewGemName(e.target.value)}
                className="bg-input border-border"
                placeholder="e.g. Paraiba Tourmaline"
                onKeyDown={(e) => { if (e.key === "Enter") handleAddGem(); }}
              />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button variant="outline" onClick={() => { setShowAddGem(false); setNewGemName(""); }}>Cancel</Button>
              <Button
                onClick={handleAddGem}
                className="gold-gradient text-primary-foreground border-0"
              >
                Add & Select
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
