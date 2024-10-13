"use client";

import React, { useState, useEffect } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getStorage } from "firebase/storage";
import { db} from "./firebase";


import {
  collection,
  addDoc,
  doc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  QuerySnapshot,
  onSnapshot,
} from "firebase/firestore";


import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Camera, Search, Plus, Trash2, Edit, ChefHat } from "lucide-react";

// Define the type for the items
interface Item {
  name: string;
  quantity: number;
  unit: string;
  imageUrl: string;
}

export default function Home() {


  // Items state
  const [items, setItems] = useState<Item[]>([

  ]);

  // Item state
  const [newItem, setNewItem] = useState<Item>({
    name: "",
    quantity: 0,
    unit: "",
    imageUrl: "",
  });

  // Add item to db
const addItem = async (e: React.FormEvent) => {
  e.preventDefault();
  if (newItem.name) {
    await addDoc(collection(db, "items"), {
      name: newItem.name,
      quantity: newItem.quantity,
      unit: newItem.unit,
      imageUrl: newItem.imageUrl,
    });
  }
};

  useEffect(() => {
    const q = query(collection(db, "items"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      let itemsArr: Item[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        itemsArr.push({
          name: data.name,
          quantity: data.quantity,
          unit: data.unit,
          imageUrl: data.imageUrl,
        });
      });
      setItems(itemsArr);
    });

    return () => unsubscribe();
  }, []);

  //delete item from db
  const deleteItem = async (name: string) => {
    const q = query(collection(db, "items"));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach(async (doc) => {
      if (doc.data().name === name) {
        await deleteDoc(doc.ref);
      }
    });
};

  return (
    <main>
      <div className="container mx-auto p-4">
        <h1 className="text-3x1 font-bold mb-4">Pantry Tracker</h1>
        <div className="mb-4">
          <input type="text" placeholder="search items..." className="w-full" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {items.map((item, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle>{item.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <img src={item.imageUrl} alt={item.name} />
                <p>
                  {item.quantity} {item.unit}
                </p>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline">
                  <Edit className="w-4 h04 mr-2"></Edit>
                </Button>
                <Button
                  onClick={() => {deleteItem(item.name);}}
                  variant="destructive">
                  <Trash2 className="w-4 h-4 mr-2">Delete</Trash2>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Add New Item</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Enter item name"
                  value={newItem.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setNewItem({ ...newItem, name: e.target.value });
                  }}
                ></Input>
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  value={newItem.quantity}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setNewItem({
                      ...newItem,
                      quantity: parseInt(e.target.value),
                    });
                  }}
                  id="quantity"
                  type="number"
                  placeholder="Enter quantity"
                />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="unit">Unit</Label>
                <Input
                  value={newItem.unit}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setNewItem({ ...newItem, unit: e.target.value });
                  }}
                  id="unit"
                  placeholder="Enter unit (e.g., boxes, cans)"
                />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="image">Image (as a url plz 😂 for now) </Label>
                <Input
                  value={newItem.imageUrl}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setNewItem({ ...newItem, imageUrl: e.target.value });
                  }}
                  id="image"
                  type="string"
                  accept="image/*"
                ></Input>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={addItem}>
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </CardFooter>
        </Card>

        <Dialog>
          <DialogTrigger asChild>
            <Button className="mt-4">
              <ChefHat className="w-4 h-4 mr-2" />
              Suggest Recipe
            </Button>
          </DialogTrigger>
          <p>Here's a recipe suggestion based on your pantry items...</p>
        </Dialog>
      </div>
    </main>
  );
}
