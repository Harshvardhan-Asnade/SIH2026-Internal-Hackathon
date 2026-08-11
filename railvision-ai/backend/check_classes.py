from ultralytics import YOLO

model = YOLO("yolo26n.pt")
classes = model.names

# check for common cleanliness related classes
target_classes = ["person", "bottle", "plastic", "trash", "garbage", "paper", "bag", "bin", "waste", "litter", "cup"]
found_classes = {}

for cls_id, cls_name in classes.items():
    if any(target in cls_name.lower() for target in target_classes) or cls_name.lower() in target_classes:
        found_classes[cls_id] = cls_name

print("=== Found Classes ===")
for k, v in found_classes.items():
    print(f"ID {k}: {v}")

print("\n=== All Classes ===")
for k, v in classes.items():
    print(f"ID {k}: {v}")
