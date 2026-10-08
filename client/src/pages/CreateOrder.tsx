import { trpc } from "@/lib/trpc";
import { DateInput } from "@/components/DateInput";
import { ImageUploader } from "@/components/ImageUploader";
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
  ImageIcon,
  Lock,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation, useParams } from "wouter";

const itemTypes = [
  "Necklace", "Earrings", "Ring", "Bracelet", "Bangle", "Pendant",
  "Brooch", "Anklet", "Baalis", "Bindi / Tika", "Clips", "Set", "Other"
];

const metalTypes = ["Gold 22k", "Gold 24k", "Gold 18k", "Silver 925", "Platinum", "Other"];

// Metals a customer can hand over as an advance.
const advanceMetalTypes = [
  "Gold 24k", "Gold 22k", "Gold 21k", "Gold 20k", "Gold 18k", "Gold 14k",
  "Old Gold", "White Gold", "Rose Gold", "Silver", "Silver 925", "Platinum", "Palladium", "Other",
];

// 1 tola = 11.664 g = 96 ratti
const TOLA_GRAMS = 11.664;
const RATTI_GRAMS = TOLA_GRAMS / 96;

function metalNetWeight(weight: string, wastage: string, wastageType: "percent" | "ratti") {
  const w = parseFloat(weight) || 0;
  const waste = parseFloat(wastage) || 0;
  if (w <= 0) return 0;
  const extra = wastageType === "ratti" ? (w / TOLA_GRAMS) * waste * RATTI_GRAMS : (w * waste) / 100;
  return Math.round((w + extra) * 1000) / 1000;
}

const toInput = (value: string | number | null | undefined) => (value === null || value === undefined ? "" : String(value));
const toDateInput = (value: string | Date | null | undefined) => (value ? new Date(value).toISOString().slice(0, 10) : "");
const capitalize = (value: string | null | undefined, fallback: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : fallback;

type OrderItemForm = {
  id?: number;
  images: string[];
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
  images: [],
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
  id?: number;
  itemName: string;
  receivedDate: string;
  weight: string;
  alloy: string;
  wastage: string;
  wastageType: "percent" | "ratti";
  netWeightRate: string;
  value: string;
  comments: string;
};

type AdvanceGemForm = {
  id?: number;
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
  const params = useParams<{ id?: string }>();
  const editId = params.id ? Number(params.id) : null;
  const isEdit = Boolean(editId);

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
  const [gemForAdvanceIdx, setGemForAdvanceIdx] = useState<number | null>(null);

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
    if (gemForAdvanceIdx !== null) {
      const name = newGemName.trim();
      setAdvanceGems(prev => prev.map((gem, i) => (i === gemForAdvanceIdx ? { ...gem, itemName: name } : gem)));
    }
    setNewGemName("");
    setShowAddGem(false);
    setGemForItemIdx(null);
    setGemForAdvanceIdx(null);
    toast.success(`"${newGemName.trim()}" added to gem list`);
  };

  // Data queries
  const { data: customers } = trpc.customers.list.useQuery();
  const { data: vendors } = trpc.vendors.list.useQuery();

  // ---- Edit mode: load the existing order once and fill the card
  const { data: editing, isLoading: editingLoading } = trpc.orderDetail.get.useQuery(
    { id: editId ?? 0 },
    { enabled: isEdit }
  );
  const [prefilled, setPrefilled] = useState(false);
  const invoiced = Boolean(editing?.invoices?.some((invoice: any) => invoice.status !== "cancelled"));
  const locked = isEdit && invoiced;

  useEffect(() => {
    if (!editing || prefilled) return;
    const order = editing.order;
    setOrderForm({
      customerId: order.customerId ?? null,
      orderDate: toDateInput(order.orderDate) || new Date().toISOString().split("T")[0],
      deliveryDate: toDateInput(order.expectedDelivery),
      description: order.description ?? "",
      comments: order.notes ?? "",
      advanceCash: Number(order.advanceCash || 0) > 0 ? toInput(order.advanceCash) : "",
    });
    setOrderItems(
      editing.items.length
        ? editing.items.map((item: any) => ({
            id: item.id,
            images: item.images ?? [],
            itemName: item.itemName ?? "",
            vendorId: item.vendorId ? String(item.vendorId) : "",
            estimatedLabourCharges: toInput(item.estimatedLabourCharges),
            bodyMakingRate: capitalize(item.bodyMakingRateType, "Simple"),
            stoneSettingRate: capitalize(item.stoneSettingRateType, "Simple"),
            estimatedMetalType: item.estimatedMetalType ?? "Gold 22k",
            estimatedMetalWeight: toInput(item.estimatedMetalWeight),
            estimatedMetalWastage: toInput(item.estimatedMetalWastage),
            estimatedMetalRate: toInput(item.estimatedMetalRate),
            estimatedMetalValue: toInput(item.estimatedMetalValue),
            estimatedGemType: item.estimatedGemType ?? "",
            estimatedGemQty: toInput(item.estimatedGemQty),
            estimatedGemWeight: toInput(item.estimatedGemWeight),
            estimatedGemRate: toInput(item.estimatedGemRate),
            estimatedGemCalcBy: item.estimatedGemCalcBy || "Weight",
            estimatedGemValue: toInput(item.estimatedGemValue),
            comments: item.comments ?? "",
          }))
        : [{ ...emptyItem }]
    );
    setAdvanceMetals(
      editing.advanceMetals.map((metal: any) => ({
        id: metal.id,
        itemName: metal.itemName ?? "",
        receivedDate: toDateInput(metal.receivedDate),
        weight: toInput(metal.weight),
        alloy: metal.alloy ?? "",
        wastage: toInput(metal.wastage),
        wastageType: metal.wastageType === "ratti" ? "ratti" : "percent",
        netWeightRate: toInput(metal.netWeightRate),
        value: toInput(metal.value),
        comments: metal.comments ?? "",
      }))
    );
    setAdvanceGems(
      editing.advanceGems.map((gem: any) => ({
        id: gem.id,
        itemName: gem.itemName ?? "",
        qty: toInput(gem.qty),
        weight: toInput(gem.weight),
        comments: gem.comments ?? "",
      }))
    );
    const knownGems = new Set(allGems);
    const extraGems = [
      ...editing.items.map((item: any) => item.estimatedGemType),
      ...editing.advanceGems.map((gem: any) => gem.itemName),
    ].filter((gem: string | null) => gem && !knownGems.has(gem) && gem !== "Other") as string[];
    if (extraGems.length) setCustomGems(prev => Array.from(new Set([...prev, ...extraGems])));
    setPrefilled(true);
  }, [editing, prefilled]);

  const editMutation = trpc.orders.edit.useMutation({
    onSuccess: () => {
      toast.success("Order updated");
      utils.orders.list.invalidate();
      utils.orderDetail.get.invalidate();
      setLocation(`/orders/${editId}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update order");
    },
  });

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
        id: item.id,
        images: item.images,
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
      .map((metal) => ({
        id: metal.id,
        itemName: metal.itemName || undefined,
        receivedDate: metal.receivedDate || undefined,
        weight: metal.weight || undefined,
        alloy: metal.alloy || undefined,
        wastage: metal.wastage || undefined,
        wastageType: metal.wastageType,
        netWeightRate: metal.netWeightRate || undefined,
        value: metal.value || undefined,
        comments: metal.comments || undefined,
      }));
    const validAdvanceGems = advanceGems
      .filter((gem) => gem.itemName || gem.qty || gem.weight)
      .map((gem) => ({
        id: gem.id,
        itemName: gem.itemName || undefined,
        qty: gem.qty ? Number(gem.qty) : undefined,
        weight: gem.weight || undefined,
        comments: gem.comments || undefined,
      }));

    if (isEdit && editId) {
      editMutation.mutate({
        id: editId,
        customerId: orderForm.customerId,
        orderDate: orderForm.orderDate || undefined,
        expectedDelivery: orderForm.deliveryDate || undefined,
        notes: orderForm.comments || undefined,
        description: orderForm.description || undefined,
        advanceCash: orderForm.advanceCash || "0",
        status: saveAsDraft ? "saved" : undefined,
        ...(locked
          ? {}
          : {
              totalItems: items.length,
              totalWeight: totalWeight.toFixed(3),
              totalPrice: totalPrice.toFixed(2),
              items,
              advanceMetals: validAdvanceMetals,
              advanceGems: validAdvanceGems,
            }),
      });
      return;
    }

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

  const updateMetal = (idx: number, field: keyof AdvanceMetalForm, value: string) => {
    setAdvanceMetals((prev) => {
      const updated = [...prev];
      const metal = { ...updated[idx], [field]: value } as AdvanceMetalForm;
      if (["weight", "wastage", "wastageType", "netWeightRate"].includes(field)) {
        const net = metalNetWeight(metal.weight, metal.wastage, metal.wastageType);
        const rate = parseFloat(metal.netWeightRate) || 0;
        if (net > 0 && rate > 0) metal.value = (net * rate).toFixed(2);
      }
      updated[idx] = metal;
      return updated;
    });
  };

  const updateGem = (idx: number, field: keyof AdvanceGemForm, value: string) => {
    setAdvanceGems((prev) => prev.map((gem, i) => (i === idx ? { ...gem, [field]: value } : gem)));
  };

  const itemTypeOptions = Array.from(new Set([...itemTypes, ...orderItems.map((item) => item.itemName).filter(Boolean)]));
  const metalOptions = Array.from(new Set([...advanceMetalTypes, ...advanceMetals.map((metal) => metal.itemName).filter(Boolean)]));
  const isSaving = createMutation.isPending || editMutation.isPending;

  const selectedCustomer = customers?.find((c) => c.id === orderForm.customerId);

  if (isEdit && (editingLoading || (editing && !prefilled))) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  if (isEdit && !editing) {
    return <div className="py-16 text-center text-muted-foreground">Order not found</div>;
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation(isEdit ? `/orders/${editId}` : "/orders")} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-foreground">
            {isEdit ? `Edit Sales Order ${editing?.order.orderNumber ?? ""}` : "Sales Order Card"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isEdit ? "Update the order, its items, advances and photos" : "Create a new sales order with items and vendor assignments"}
          </p>
        </div>
      </div>

      {locked && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-foreground">
            This order already has an invoice, so the customer, advance cash, items and advances are locked.
            Cancel the invoice first to change them. Dates, description and comments can still be edited.
          </p>
        </div>
      )}

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
                disabled={locked}
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
              <Button variant="outline" size="icon" onClick={() => setShowNewCustomer(true)} title="Add New Customer" disabled={locked}>
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Dates Row */}
          <div className="grid grid-cols-2 gap-6">
            <div className="grid grid-cols-[140px_1fr] items-center gap-4">
              <Label className="text-sm font-medium text-foreground">Order Date</Label>
              <DateInput value={orderForm.orderDate} onChange={value => setOrderForm({ ...orderForm, orderDate: value })} className="" />
            </div>
            <div className="grid grid-cols-[140px_1fr] items-center gap-4">
              <Label className="text-sm font-medium text-foreground">Delivery Date</Label>
              <DateInput value={orderForm.deliveryDate} onChange={value => setOrderForm({ ...orderForm, deliveryDate: value })} className="" />
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
              disabled={locked}
              className="bg-input border-border max-w-xs"
            />
          </div>
        </div>
      </div>

      <fieldset disabled={locked} className="m-0 min-w-0 space-y-6 border-0 p-0">
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
            disabled={locked}
            onClick={() =>
              setAdvanceMetals([
                ...advanceMetals,
                { itemName: "", receivedDate: "", weight: "", wastage: "", wastageType: "percent", alloy: "", netWeightRate: "", value: "", comments: "" },
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
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground min-w-[140px]">Metal</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground min-w-[140px]">Recv. Date</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground min-w-[110px]">Weight (gm)</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground min-w-[170px]">Wastage</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground min-w-[100px]">Net Wt (gm)</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Alloy</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground min-w-[100px]">Rate / gm</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground min-w-[110px]">Value</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Comments</th>
                <th className="px-3 py-2.5 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {advanceMetals.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-6 text-center text-muted-foreground text-xs italic">
                    No advance metals added. Click "Add More" to add entries.
                  </td>
                </tr>
              ) : (
                advanceMetals.map((metal, idx) => {
                  const net = metalNetWeight(metal.weight, metal.wastage, metal.wastageType);
                  return (
                  <tr key={metal.id ?? `new-${idx}`} className="border-b border-border/50">
                    <td className="px-3 py-1.5">
                      <Select value={metal.itemName} onValueChange={(v) => updateMetal(idx, "itemName", v)} disabled={locked}>
                        <SelectTrigger className="bg-input border-border h-8 text-xs">
                          <SelectValue placeholder="Select metal" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {metalOptions.map((m) => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-3 py-1.5">
                      <DateInput value={metal.receivedDate} onChange={(value) => updateMetal(idx, "receivedDate", value)} className="h-8 text-xs" disabled={locked} />
                    </td>
                    <td className="px-3 py-1.5">
                      <Input type="number" step="0.001" value={metal.weight} onChange={(e) => updateMetal(idx, "weight", e.target.value)} className="bg-input border-border h-8 text-xs" placeholder="0.000" />
                    </td>
                    <td className="px-3 py-1.5">
                      <div className="flex gap-1">
                        <Input type="number" step="0.01" value={metal.wastage} onChange={(e) => updateMetal(idx, "wastage", e.target.value)} className="bg-input border-border h-8 text-xs w-20" placeholder="0" />
                        <Select value={metal.wastageType} onValueChange={(v) => updateMetal(idx, "wastageType", v)} disabled={locked}>
                          <SelectTrigger className="bg-input border-border h-8 text-xs w-[84px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percent">%</SelectItem>
                            <SelectItem value="ratti">Ratti</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </td>
                    <td className="px-3 py-1.5">
                      <Input value={net > 0 ? net.toFixed(3) : ""} readOnly className="bg-muted/50 border-border h-8 text-xs font-medium" placeholder="0.000" />
                    </td>
                    <td className="px-3 py-1.5">
                      <Input value={metal.alloy} onChange={(e) => updateMetal(idx, "alloy", e.target.value)} className="bg-input border-border h-8 text-xs" placeholder="22k" />
                    </td>
                    <td className="px-3 py-1.5">
                      <Input type="number" value={metal.netWeightRate} onChange={(e) => updateMetal(idx, "netWeightRate", e.target.value)} className="bg-input border-border h-8 text-xs" placeholder="0" />
                    </td>
                    <td className="px-3 py-1.5">
                      <Input type="number" value={metal.value} onChange={(e) => updateMetal(idx, "value", e.target.value)} className="bg-input border-border h-8 text-xs" placeholder="0" />
                    </td>
                    <td className="px-3 py-1.5">
                      <Input value={metal.comments} onChange={(e) => updateMetal(idx, "comments", e.target.value)} className="bg-input border-border h-8 text-xs" placeholder="Notes" />
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <p className="px-5 py-2 text-[11px] text-muted-foreground border-t border-border/50">
          Net weight = weight + wastage. Ratti wastage is per tola (1 tola = 11.664 gm = 96 ratti).
        </p>
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
            disabled={locked}
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
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground min-w-[200px]">Items</th>
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
                  <tr key={gem.id ?? `new-${idx}`} className="border-b border-border/50">
                    <td className="px-3 py-1.5">
                      <div className="flex gap-1">
                        <Select value={gem.itemName} onValueChange={(v) => updateGem(idx, "itemName", v)} disabled={locked}>
                          <SelectTrigger className="bg-input border-border h-8 text-xs flex-1">
                            <SelectValue placeholder="Select gem" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {Array.from(new Set([...allGems, ...(gem.itemName ? [gem.itemName] : [])])).map((name) => (
                              <SelectItem key={name} value={name}>{name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          title="Add new gem"
                          onClick={() => { setGemForAdvanceIdx(idx); setGemForItemIdx(null); setShowAddGem(true); }}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                    <td className="px-3 py-1.5">
                      <Input type="number" value={gem.qty} onChange={(e) => updateGem(idx, "qty", e.target.value)} className="bg-input border-border h-8 text-xs" placeholder="0" />
                    </td>
                    <td className="px-3 py-1.5">
                      <Input type="number" value={gem.weight} onChange={(e) => updateGem(idx, "weight", e.target.value)} className="bg-input border-border h-8 text-xs" placeholder="0.000" />
                    </td>
                    <td className="px-3 py-1.5">
                      <Input value={gem.comments} onChange={(e) => updateGem(idx, "comments", e.target.value)} className="bg-input border-border h-8 text-xs" placeholder="Notes" />
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
            disabled={locked}
            onClick={() => setOrderItems([...orderItems, { ...emptyItem, images: [] }])}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Item
          </Button>
        </div>

        <div className="divide-y divide-border">
          {orderItems.map((item, idx) => (
            <div key={item.id ?? `new-${idx}`} className="p-5 space-y-4">
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
                  <Select value={item.itemName} onValueChange={(v) => updateItem(idx, "itemName", v)} disabled={locked}>
                    <SelectTrigger className="bg-input border-border h-9">
                      <SelectValue placeholder="Select item" />
                    </SelectTrigger>
                    <SelectContent>
                      {itemTypeOptions.map((t) => (
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

              {/* Item Images */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5" /> Design Images (shown on the invoice)
                </Label>
                <ImageUploader
                  images={item.images}
                  disabled={locked}
                  onChange={(images) => setOrderItems((prev) => prev.map((it, i) => (i === idx ? { ...it, images } : it)))}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      </fieldset>

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
          {isEdit ? (
            <Button variant="outline" onClick={() => setLocation(`/orders/${editId}`)} disabled={isSaving}>
              Cancel
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => handleSubmit(true)}
              disabled={isSaving}
            >
              <Save className="h-4 w-4 mr-2" />
              Save & Continue Later
            </Button>
          )}
          <Button
            onClick={() => handleSubmit(false)}
            disabled={isSaving}
            className="gold-gradient text-primary-foreground border-0"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {isEdit ? "Save Changes" : "Create Order"}
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
