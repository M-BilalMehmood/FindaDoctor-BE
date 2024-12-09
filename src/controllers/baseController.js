class BaseController {
    constructor(model) {
        this.model = model;
    }

    async getAll(req, res) {
        try {
            const items = await this.model.find();
            res.status(200).json(items);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getById(req, res) {
        try {
            const item = await this.model.findById(req.params.id);
            if (!item) {
                return res.status(404).json({ message: 'Item not found' });
            }
            res.status(200).json(item);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async create(req, res) {
        try {
            const newItem = new this.model(req.body);
            const savedItem = await newItem.save();
            res.status(201).json(savedItem);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }

    async update(req, res) {
        try {
            const updatedItem = await this.model.findByIdAndUpdate(req.params.id, req.body, { new: true });
            if (!updatedItem) {
                return res.status(404).json({ message: 'Item not found' });
            }
            res.status(200).json(updatedItem);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }

    async delete(req, res) {
        try {
            const deletedItem = await this.model.findByIdAndDelete(req.params.id);
            if (!deletedItem) {
                return res.status(404).json({ message: 'Item not found' });
            }
            res.status(200).json({ message: 'Item deleted successfully' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

export default BaseController;
