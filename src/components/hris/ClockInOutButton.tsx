"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Clock, MapPin, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface ClockInOutButtonProps {
  employeeId?: string;
  onClockInSuccess?: (data: any) => void;
  onClockOutSuccess?: (data: any) => void;
  variant?: "default" | "large";
}

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  address?: string;
}

export function ClockInOutButton({
  employeeId,
  onClockInSuccess,
  onClockOutSuccess,
  variant = "default",
}: ClockInOutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [lastAttendanceId, setLastAttendanceId] = useState<string | null>(null);
  const { toast } = useToast();

  const getLocation = useCallback((): Promise<LocationData | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          console.warn("Geolocation error:", error);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }, []);

  const handleClockAction = async (action: "clock-in" | "clock-out") => {
    try {
      setIsLoading(true);

      // Get location for clock-in
      let locationData: LocationData | null = null;
      if (action === "clock-in") {
        locationData = await getLocation();
        setLocation(locationData);
        // Store action in a ref or directly call from dialog
        if (locationData) {
          setShowLocationDialog(true);
          // Store the action to be used by confirmLocation
          (window as any).__pendingClockAction = action;
          return;
        }
      }

      // Proceed without location dialog (clock-out or no GPS)
      await performClockAction(action, action === "clock-in" ? locationData : undefined);
    } catch (error) {
      console.error("Clock action error:", error);
      toast({
        title: "Error",
        description: "Gagal melakukan absensi. Silakan coba lagi.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const performClockAction = async (action: "clock-in" | "clock-out", locData?: LocationData | null) => {
    const response = await fetch("/api/hris/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        employee_id: employeeId,
        ...(action === "clock-in" && locData
          ? { clock_in_location: locData }
          : {}),
        ...(action === "clock-out" && lastAttendanceId
          ? { attendance_id: lastAttendanceId }
          : {}),
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Failed to process");
    }

    if (action === "clock-in") {
      setLastAttendanceId(result.data.id);
      onClockInSuccess?.(result.data);
      toast({
        title: "✅ Clock-in Berhasil",
        description: `Waktu: ${new Date().toLocaleTimeString("id-ID")}${locData ? " 📍 Lokasi tercatat" : ""}`,
      });
    } else {
      onClockOutSuccess?.(result.data);
      toast({
        title: "✅ Clock-out Berhasil",
        description: `Waktu: ${new Date().toLocaleTimeString("id-ID")}`,
      });
    }

    setShowLocationDialog(false);
    setPendingAction(null);
  };

  const confirmLocation = () => {
    const action = (window as any).__pendingClockAction as "clock-in" | "clock-out";
    if (action) {
      performClockAction(action, location);
      delete (window as any).__pendingClockAction;
    }
  };

  const cancelLocation = () => {
    setShowLocationDialog(false);
    setLocation(null);
    delete (window as any).__pendingClockAction;
  };

  const sizeClasses = variant === "large" 
    ? "h-14 px-8 text-lg" 
    : "h-10 px-4";

  return (
    <>
      <div className="flex gap-3">
        <Button
          onClick={() => handleClockAction("clock-in")}
          disabled={isLoading}
          className={`${sizeClasses} bg-green-600 hover:bg-green-700`}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Clock className="w-4 h-4 mr-2" />
          )}
          Clock In
        </Button>

        <Button
          onClick={() => handleClockAction("clock-out")}
          disabled={isLoading || !lastAttendanceId}
          variant="outline"
          className={sizeClasses}
        >
          {isLoading && pendingAction === "clock-out" ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Clock className="w-4 h-4 mr-2" />
          )}
          Clock Out
        </Button>
      </div>

      {/* Location Confirmation Dialog */}
      <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Lokasi Clock-In</DialogTitle>
            <DialogDescription>
              Kami akan mencatat lokasi Anda saat clock-in untuk keperluan absensi.
            </DialogDescription>
          </DialogHeader>

          {location && (
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium">Lokasi Tercatat:</span>
              </div>
              <div className="text-sm text-muted-foreground ml-6">
                <p>Latitude: {location.latitude.toFixed(6)}</p>
                <p>Longitude: {location.longitude.toFixed(6)}</p>
                <p>Akurasi: ±{Math.round(location.accuracy)} meter</p>
              </div>
            </div>
          )}

          {!location && (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <XCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    Lokasi tidak tersedia
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    GPS tidak dapat diakses. Clock-in tetap dapat dilakukan tanpa lokasi.
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={cancelLocation}>
              Batal
            </Button>
            <Button onClick={confirmLocation} className="bg-green-600 hover:bg-green-700">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Konfirmasi Clock-In
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
